/**
 * Structured-output round-trip spike — a one-off probe, NOT shipped code and NOT
 * run in CI. Deliverable: the recorded finding in `.specs/STATE.md` and
 * `research/research-aisdk.md`.
 *
 * The question it answers: does ADR-005's wrapped discriminated union
 * (`Output.object({ interpretation: z.array(Operation), nextMove })`,
 * `structuredOutputMode: 'outputFormat'`, model `claude-sonnet-5`, no temperature)
 * survive `@ai-sdk/anthropic`'s `oneOf → anyOf` sanitiser and round-trip against
 * the live API?
 *
 * Two runs:
 *   A — the Zod union passed directly, exactly as ADR-005 describes.
 *   B — the derived JSON Schema with empty `{}` sub-schemas (from `z.unknown()`,
 *       i.e. `resolve.reference`, deliberately untyped in storage per ADR-004)
 *       replaced with a concrete type, to isolate whether `oneOf → anyOf` alone
 *       is the blocker.
 *
 * Run: `pnpm spike:structured-output` (sets `JITI_TSCONFIG_PATHS=1` for the `~/`
 * alias). The key is read from `.env` (ADR-011 — the file `pnpm dev` uses) or the
 * environment; with no key it prints "skipped — no ANTHROPIC_API_KEY" and exits 0.
 */
import { anthropic } from '@ai-sdk/anthropic'
import { generateText, jsonSchema, Output } from 'ai'
import { z } from 'zod'

const NEXT_MOVE = z.object({
  kind: z.enum(['ask-question', 'acknowledge', 'summarise-phase']),
  prompt: z.string(),
})

const INSTRUCTIONS =
  "Convert the domain expert's narration into EventStorming board operations. " +
  'Every operation carries an author — use {"accepter":{"name":"spike"}}. ' +
  'capture-domain-event / identify-actor / identify-system each need an "id" and a ' +
  'past-tense "label".'
const NARRATION = 'The customer placed an order, and then the kitchen started cooking it.'

type Emptyable = Record<string, unknown> & { oneOf?: unknown[]; anyOf?: unknown[]; type?: string }

type GenerateOutput = NonNullable<Parameters<typeof generateText>[0]['output']>

async function run(label: string, output: GenerateOutput): Promise<void> {
  console.log(`\n========== RUN ${label} ==========`)
  try {
    const result = await generateText({
      model: anthropic('claude-sonnet-5'),
      output,
      providerOptions: { anthropic: { structuredOutputMode: 'outputFormat' } },
      instructions: INSTRUCTIONS,
      prompt: NARRATION,
    })
    console.log('OK — output:')
    console.dir(result.output, { depth: null })
    console.log('warnings:', result.warnings)
    console.log('finishReason:', result.finishReason, '· usage:', result.usage)
  } catch (error) {
    const errorShape = error as { name?: string; message?: string; data?: unknown }
    console.log(`FAILED — ${errorShape.name ?? 'Error'}: ${errorShape.message ?? String(error)}`)
    if (errorShape.data) console.dir(errorShape.data, { depth: null })
  }
}

async function main(): Promise<void> {
  try {
    process.loadEnvFile()
  } catch {
    /* no .env file — fall back to the ambient environment */
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('skipped — no ANTHROPIC_API_KEY')
    return
  }

  const { Operation } = await import('~/domain-model-capture/api.ts')
  const wrapped = z.object({ interpretation: z.array(Operation), nextMove: NEXT_MOVE })

  // RUN A — the Zod union directly, per ADR-005.
  await run('A (Zod union direct, per ADR-005)', Output.object({ schema: wrapped }))

  // RUN B — derived JSON Schema, oneOf→anyOf + empty-schema patched.
  const patched = z.toJSONSchema(wrapped, {
    target: 'draft-2020-12',
    io: 'input',
    unrepresentable: 'throw',
    override: ({ jsonSchema: draftSchema }) => {
      const schema = draftSchema as Emptyable
      if (Array.isArray(schema.oneOf)) {
        schema.anyOf = schema.oneOf
        delete schema.oneOf
      }
      // z.unknown() → `{}` (accepts any JSON); Anthropic's output_config rejects it.
      if (Object.keys(schema).length === 0) schema.type = 'string'
    },
  })
  // `z.toJSONSchema` emits Draft-2020-12; `jsonSchema()` types its arg as Draft-7. Structurally
  // compatible for this probe — the cast keeps the throwaway script typechecking under `pnpm check`.
  await run(
    'B (derived JSON Schema, empty-schema → string)',
    Output.object({ schema: jsonSchema(patched as Parameters<typeof jsonSchema>[0]) }),
  )
}

main().catch((error: unknown) => {
  console.error('spike failed:', error)
  process.exitCode = 1
})
