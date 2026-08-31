import { OpenTelemetry } from '@ai-sdk/otel'
import { generateText, NoObjectGeneratedError, Output, registerTelemetry } from 'ai'
import type { ZodType } from 'zod'
import type { Clock } from '~/plumbing/clock.ts'
import { logModelCall } from '~/plumbing/model-call-log.ts'
import { estimateCost, type ModelName, type TokenUsage } from '~/plumbing/model-pricing.ts'
import { err, ok, type Result } from '~/plumbing/result.ts'
import type { Facilitator, FacilitatorFailure, FacilitatorInput } from './port.ts'
import { FacilitationTurnSchema, OpeningQuestionSchema } from './turn-schema.ts'

/**
 * The Anthropic adapter for the `Facilitator` port.
 *
 * - `generateText` + `Output.object`, `structuredOutputMode: 'outputFormat'`,
 *   `effort: 'low'`, no `temperature` (Sonnet 5 strips it — docs/agents/ai-harness-gotchas.md).
 * - Model ladder: `claude-sonnet-5` → backoff → `claude-sonnet-5` → backoff →
 *   `claude-haiku-4-5`. A `provider-down` step (5xx / timeout / transport) walks
 *   to the next rung; the ladder exhausting returns `provider-down`.
 * - **One schema-retry total** across the whole ladder (not per rung) with the
 *   validation error fed back; a second schema failure returns `schema-invalid`.
 * - One `model-call-log` JSONL line per call, carrying `result.warnings`.
 *
 * `generate` and `sleep` are injected seams — every test mocks `generate` at the
 * `ai` boundary, so no test makes a real HTTP call.
 */

interface FacilitatorGenerateArguments {
  model: ModelName
  schema: ZodType
  instructions: string
  prompt: string
}

export interface FacilitatorGenerateResult {
  output: unknown
  warnings: unknown
  responseText: string
  usage: TokenUsage
}

export type FacilitatorGenerate = (args: FacilitatorGenerateArguments) => Promise<FacilitatorGenerateResult>

interface LadderRung {
  model: ModelName
  backoffMs: number
}

/**
 * The retry ladder: the primary model twice (immediate, then a 2s backoff),
 * then `claude-haiku-4-5` as the last resort. `FACILITATOR_MODEL` sets the
 * primary; unset → `claude-sonnet-5` (ADR-005).
 */
const buildLadder = (primary: ModelName): readonly LadderRung[] => [
  { model: primary, backoffMs: 0 },
  { model: primary, backoffMs: 2_000 },
  { model: 'claude-haiku-4-5', backoffMs: 4_000 },
]

export interface AnthropicFacilitatorDeps {
  dataDirectory: string
  clock: Clock
  /** Primary model for the ladder. Unset → `claude-sonnet-5`. */
  model?: ModelName
  /** Per-attempt deadline for one `generateText` call. Unset → 30s. */
  attemptTimeoutMs?: number
  generate?: FacilitatorGenerate
  sleep?: (ms: number) => Promise<void>
  ladder?: readonly LadderRung[]
}

let telemetryRegistered = false
const ensureTelemetry = (): void => {
  if (telemetryRegistered) return
  registerTelemetry(new OpenTelemetry())
  telemetryRegistered = true
}

// Bounds ONE `generateText` call. The abort surfaces as a thrown error →
// `provider-down` → the ladder continues. Note this bounds the attempt, not the
// turn: a full `interpret()` can still walk all three rungs plus the schema
// retry, so its worst case is ≈ 3 × this + the 2s/4s backoffs (~2 min). The
// scheduler ticks run in sequence, so that worst case also delays reconcile for
// every workshop — acceptable at v1 single-user scale.
const DEFAULT_ATTEMPT_TIMEOUT_MS = 30_000

const makeDefaultGenerate =
  (attemptTimeoutMs: number): FacilitatorGenerate =>
  async ({ model, schema, instructions, prompt }) => {
    ensureTelemetry()
    const { anthropic } = await import('@ai-sdk/anthropic')
    const result = await generateText({
      model: anthropic(model),
      output: Output.object({ schema }),
      providerOptions: { anthropic: { structuredOutputMode: 'outputFormat', effort: 'low' } },
      instructions,
      prompt,
      abortSignal: AbortSignal.timeout(attemptTimeoutMs),
    })
    const details = result.usage.inputTokenDetails
    return {
      output: result.output,
      warnings: result.warnings,
      responseText: JSON.stringify(result.output),
      usage: {
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
        ...(details.cacheReadTokens === undefined ? {} : { cacheReadTokens: details.cacheReadTokens }),
      },
    }
  }

// 4xx codes that are transient, not a bad request: rate limit, request timeout,
// conflict, too-early. Classified `provider-down` so the ladder retries instead
// of terminally failing the contribution.
const RETRYABLE_STATUS = new Set([408, 409, 425, 429])

const classifyThrown = (error: unknown): FacilitatorFailure['kind'] => {
  if (NoObjectGeneratedError.isInstance(error)) return 'schema-invalid'
  // The AI SDK's `APICallError` already computes a retryable flag (408/409/429/5xx,
  // plus anything a provider marks transient) — trust it before guessing from the status.
  if ((error as { isRetryable?: unknown }).isRetryable === true) return 'provider-down'
  const status = (error as { statusCode?: unknown }).statusCode
  if (typeof status === 'number' && RETRYABLE_STATUS.has(status)) return 'provider-down'
  if (typeof status === 'number' && status >= 400 && status < 500) return 'schema-invalid'
  return 'provider-down'
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error)

type StepOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; kind: 'provider-down' }
  | { ok: false; kind: 'schema-invalid'; detail: string }

export const createAnthropicFacilitator = (deps: AnthropicFacilitatorDeps): Facilitator => {
  const generate =
    deps.generate ?? makeDefaultGenerate(deps.attemptTimeoutMs ?? DEFAULT_ATTEMPT_TIMEOUT_MS)
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const ladder = deps.ladder ?? buildLadder(deps.model ?? 'claude-sonnet-5')

  const runStep = async <T>(
    model: ModelName,
    schema: ZodType<T>,
    instructions: string,
    prompt: string,
  ): Promise<StepOutcome<T>> => {
    let raw: FacilitatorGenerateResult
    try {
      raw = await generate({ model, schema, instructions, prompt })
    } catch (error) {
      const kind = classifyThrown(error)
      // usage 0 on a throw: a client-side abort (or a transport error) fires
      // after the request reached the provider, which may still bill it — the
      // JSONL ledger under-accounts a timed-out attempt. Acceptable for a
      // best-effort cost estimate; revisit if spend tracking needs to be exact.
      logModelCall(deps.dataDirectory, {
        at: deps.clock(),
        model,
        requestMessages: { instructions, prompt },
        responseText: '',
        parseResult: { error: messageOf(error) },
        warnings: undefined,
        usage: { inputTokens: 0, outputTokens: 0 },
        costEstimateUsd: 0,
      })
      return kind === 'schema-invalid'
        ? { ok: false, kind, detail: messageOf(error) }
        : { ok: false, kind }
    }

    const parsed = schema.safeParse(raw.output)
    const detail = parsed.success
      ? ''
      : parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    logModelCall(deps.dataDirectory, {
      at: deps.clock(),
      model,
      requestMessages: { instructions, prompt },
      responseText: raw.responseText,
      parseResult: parsed.success ? 'ok' : { error: detail },
      warnings: raw.warnings,
      usage: raw.usage,
      costEstimateUsd: estimateCost(model, raw.usage),
    })
    return parsed.success
      ? { ok: true, value: parsed.data }
      : { ok: false, kind: 'schema-invalid', detail }
  }

  const call = async <T>(
    schema: ZodType<T>,
    input: FacilitatorInput,
  ): Promise<Result<T, FacilitatorFailure>> => {
    let schemaRetried = false

    for (const rung of ladder) {
      if (rung.backoffMs > 0) await sleep(rung.backoffMs)

      const attempt = await runStep(rung.model, schema, input.instructions, input.prompt)
      if (attempt.ok) return ok(attempt.value)
      if (attempt.kind === 'provider-down') continue

      if (schemaRetried) return err({ kind: 'schema-invalid', detail: attempt.detail })
      schemaRetried = true
      const retryPrompt = `${input.prompt}\n\n---\nYour previous response did not match the required schema:\n${attempt.detail}\nReturn only valid JSON matching the schema.`
      const retry = await runStep(rung.model, schema, input.instructions, retryPrompt)
      if (retry.ok) return ok(retry.value)
      if (retry.kind === 'schema-invalid') return err({ kind: 'schema-invalid', detail: retry.detail })
      // retry hit provider-down — walk to the next ladder rung
    }

    return err({ kind: 'provider-down' })
  }

  return {
    interpret: (input) => call(FacilitationTurnSchema, input),
    askOpening: (input) => call(OpeningQuestionSchema, input),
  }
}
