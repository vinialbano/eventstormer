/**
 * R3 structured-output round-trip spike (S0-27 / S0-28) — a one-off probe, NOT
 * shipped code and NOT run in CI. Deliverable: the recorded finding in
 * `.specs/STATE.md` and `research/research-aisdk.md`.
 *
 * It sends ADR-005's exact facilitator setup to a real Claude model:
 *   generateText + Output.object({ interpretation: z.array(Operation), nextMove })
 *   — the object wrapper, not a bare Output.array —
 *   providerOptions.anthropic.structuredOutputMode: 'outputFormat' pinned,
 *   model 'claude-sonnet-5', NO temperature (silently stripped on Sonnet 5,
 *   research/research-aisdk.md §3).
 *
 * The question it answers: does the wrapped discriminated union survive
 * `@ai-sdk/anthropic`'s `oneOf → anyOf` sanitiser on the outputFormat path, and
 * round-trip against the live API?
 *
 * Run: `pnpm spike:structured-output` (needs ANTHROPIC_API_KEY). With no key it
 * prints "skipped — no ANTHROPIC_API_KEY" and exits 0.
 */
import { anthropic } from '@ai-sdk/anthropic'
import { generateText, Output } from 'ai'
import { z } from 'zod'

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('skipped — no ANTHROPIC_API_KEY')
    return
  }

  // Lazily imported so the "skipped" path resolves no module graph. The `~/`
  // alias inside the domain code needs a paths-aware loader (jiti via the
  // `spike:structured-output` script).
  const { Operation } = await import('~/domain-model-capture/api.ts')

  const result = await generateText({
    model: anthropic('claude-sonnet-5'),
    output: Output.object({
      schema: z.object({
        interpretation: z.array(Operation),
        nextMove: z.object({
          kind: z.enum(['ask-question', 'acknowledge', 'summarise-phase']),
          prompt: z.string(),
        }),
      }),
    }),
    providerOptions: { anthropic: { structuredOutputMode: 'outputFormat' } },
    // No temperature — Sonnet 5 rejects sampling params and only warns.
    messages: [
      {
        role: 'system',
        content:
          "Convert the domain expert's narration into EventStorming board operations. " +
          'Every operation carries an author — use {"accepter":{"name":"spike"}}. ' +
          'capture-domain-event / identify-actor / identify-system each need an "id" and a ' +
          'past-tense "label".',
      },
      {
        role: 'user',
        content: 'The customer placed an order, and then the kitchen started cooking it.',
      },
    ],
  })

  console.log('=== result.output ===')
  console.dir(result.output, { depth: null })
  console.log('=== result.warnings ===')
  console.dir(result.warnings, { depth: null })
  console.log('=== finishReason ===', result.finishReason)
  console.log('=== usage ===', result.usage)
}

main().catch((error: unknown) => {
  console.error('spike failed:', error)
  process.exitCode = 1
})
