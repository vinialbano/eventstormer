/**
 * `pnpm seed [--force]` — load the offline demo workshop.
 *
 * A thin entry: parse `--force`, build a `HostConfig` with the scripted seed
 * facilitator (no model, no key), call `runSeed`, print the workshop id + its
 * resumable URL, and set the exit code. All the orchestration is in
 * `src/host/seed.ts`. Run: `JITI_TSCONFIG_PATHS=1 jiti scripts/seed.ts`.
 *
 * Run it with `pnpm dev` stopped — `--force` wipes only the marked seed
 * workshop's streams, never the whole database.
 */
import { join } from 'node:path'
import { loadConfig } from '~/host/config.ts'
import { runSeed } from '~/host/seed.ts'
import interpretation from './seed/interpretation.json'
import { parseSeedScript, seedScriptedFacilitator } from './seed/facilitator.ts'

const SCOPE_STATEMENT =
  "We're mapping how a dinner order gets from the table to the guest — the kitchen side of it."

async function main(): Promise<void> {
  for (const file of ['.env.local', '.env']) {
    try {
      process.loadEnvFile(file)
    } catch {
      /* file absent — fall through */
    }
  }

  const force = process.argv.slice(2).includes('--force')

  const config = loadConfig({ ...process.env, FACILITATOR_MODE: 'scripted' })
  const script = parseSeedScript(interpretation)
  const turns = Object.keys(script).map((body) => ({ speaker: 'Sam', body }))
  const markerPath = join(process.env.DATA_DIR ?? './data', 'seed.json')

  const outcome = await runSeed(
    { config, facilitator: seedScriptedFacilitator(script), turns, scopeStatement: SCOPE_STATEMENT, creatorName: 'Sam', markerPath },
    { force },
  )

  if (outcome.status === 'refused') {
    console.error(
      `already seeded (workshop ${outcome.workshopId}) — pass --force to wipe it and re-seed`,
    )
    process.exitCode = 1
    return
  }

  console.log(`workshop ${outcome.workshopId}`)
  console.log(`  ${outcome.url}`)
}

main().catch((error: unknown) => {
  console.error('seed failed:', error)
  process.exitCode = 1
})
