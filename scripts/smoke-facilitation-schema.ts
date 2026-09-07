/**
 * Live structured-output smoke check of the assembled `FacilitationTurnSchema`
 * (FREL-04). NOT shipped code, NOT run in CI (AD-027) — a manual probe whose
 * deliverable is the recorded finding in `research/research-aisdk.md`.
 *
 * The question it answers: does the full turn schema — now carrying the
 * `propose-relation` / `propose-pivotal` / `propose-reword` strands beside the
 * eight original ones — survive `@ai-sdk/anthropic`'s structured-output path and
 * round-trip against the live API, exactly as the real adapter calls it
 * (`Output.object({ schema })`, `structuredOutputMode: 'outputFormat'`,
 * `effort: 'low'`, model `claude-sonnet-5`, `instructions` role)?
 *
 * Run: `pnpm smoke:facilitation-schema` (sets `JITI_TSCONFIG_PATHS=1` for the
 * `~/` alias). The key is read from `.env` (ADR-011) or the environment; with no
 * key it prints "skipped — no ANTHROPIC_API_KEY" and exits 0.
 */
import { anthropic } from '@ai-sdk/anthropic'
import { generateText, Output } from 'ai'
import { FacilitationTurnSchema } from '~/session-facilitation/infrastructure/facilitator/turn-schema.ts'

const INSTRUCTIONS =
  "Convert the domain expert's narration into EventStorming facilitation strands. " +
  'Name endpoints by their exact board labels. Only propose a pivotal mark or a ' +
  'reword when the board already has structure.'

const NARRATION =
  'The order is placed first, and only then does the kitchen start cooking it — ' +
  'the "order served" step is the real milestone. Also, "order in" should really ' +
  'read "order placed".'

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

  try {
    const result = await generateText({
      model: anthropic('claude-sonnet-5'),
      output: Output.object({ schema: FacilitationTurnSchema }),
      providerOptions: { anthropic: { structuredOutputMode: 'outputFormat', effort: 'low' } },
      instructions: INSTRUCTIONS,
      prompt: NARRATION,
    })
    console.log('PASS — the assembled FacilitationTurnSchema round-tripped.')
    console.dir(result.output, { depth: null })
    console.log('warnings:', result.warnings)
  } catch (error) {
    const shape = error as { name?: string; message?: string; data?: unknown }
    console.log(`FAIL — ${shape.name ?? 'Error'}: ${shape.message ?? String(error)}`)
    if (shape.data) console.dir(shape.data, { depth: null })
    process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  console.error('smoke failed:', error)
  process.exitCode = 1
})
