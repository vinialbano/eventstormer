import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { systemClock } from '~/plumbing/clock.ts'
import { isOk } from '~/plumbing/result.ts'
import { createAnthropicFacilitator } from '~/session-facilitation/api.ts'
import { facilitationContext } from '~/session-facilitation/domain/read-models/facilitation.ts'
import {
  hasFlagPhase,
  isPastTenseLabel,
  proposedKinds,
  sharesContentWord,
} from '~/session-facilitation/infrastructure/facilitator/eval-oracles.ts'
import { buildInstructions, buildTurnInput } from '~/session-facilitation/infrastructure/facilitator/prompt.ts'
import type { FacilitationTrack } from '~/session-facilitation/infrastructure/facilitator/turn-schema.ts'
import { formatEvalTable, spliceEvalResults } from './report.ts'

const RUNS = 5
const DATA_DIRECTORY = 'eval-runs'
const FIXTURE_FILES = ['kind.json', 'past-tense.json', 'near-miss.json', 'kept-phrasing.json'] as const

const BLOCK_KINDS = new Set(['domain-event', 'actor', 'system'])

export interface EvalFixture {
  id: string
  scopeStatement: string
  contribution: { speaker: string; body: string }
  expect: {
    kind?: 'domain-event' | 'actor' | 'system'
    pastTense?: true
    notFlagPhase?: true
    sharesContentWord?: true
  }
}

export interface EvalRow {
  caseId: string
  assertion: string
  passed: number
  runs: 5
}

export interface RunEvalOptions {
  report: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseContribution = (value: unknown): EvalFixture['contribution'] => {
  if (!isRecord(value) || typeof value.speaker !== 'string' || typeof value.body !== 'string') {
    throw new Error('eval fixture contribution must have speaker and body strings')
  }
  return { speaker: value.speaker, body: value.body }
}

const parseExpect = (value: unknown): EvalFixture['expect'] => {
  if (!isRecord(value)) throw new Error('eval fixture expect must be an object')
  const parsed: EvalFixture['expect'] = {}
  if (value.kind !== undefined) {
    if (typeof value.kind !== 'string' || !BLOCK_KINDS.has(value.kind)) {
      throw new Error('eval fixture expect.kind must be domain-event, actor, or system')
    }
    parsed.kind = value.kind as 'domain-event' | 'actor' | 'system'
  }
  if (value.pastTense === true) parsed.pastTense = true
  if (value.notFlagPhase === true) parsed.notFlagPhase = true
  if (value.sharesContentWord === true) parsed.sharesContentWord = true
  return parsed
}

const parseFixture = (value: unknown): EvalFixture => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.scopeStatement !== 'string') {
    throw new Error('eval fixture must have id and scopeStatement strings')
  }
  return {
    id: value.id,
    scopeStatement: value.scopeStatement,
    contribution: parseContribution(value.contribution),
    expect: parseExpect(value.expect),
  }
}

const loadEnvironmentFiles = (): void => {
  for (const file of ['.env.local', '.env']) {
    try {
      process.loadEnvFile(file)
    } catch {
      /* file absent — fall through to the next / the ambient environment */
    }
  }
}

const requireApiKey = (): void => {
  if ((process.env.ANTHROPIC_API_KEY ?? '') === '') {
    throw new Error('ANTHROPIC_API_KEY is not set — add it to .env.local before running `pnpm eval`.')
  }
}

const loadFixtures = (): EvalFixture[] => {
  const directory = join(import.meta.dirname, 'fixtures')
  return FIXTURE_FILES.map((file) =>
    parseFixture(JSON.parse(readFileSync(join(directory, file), 'utf8')) as unknown),
  )
}

const proposedLabels = (tracks: FacilitationTrack[]): string[] =>
  tracks.flatMap((track) => (track.track === 'propose-building-block' ? [track.label] : []))

const domainEventLabels = (tracks: FacilitationTrack[]): string[] =>
  tracks.flatMap((track) =>
    track.track === 'propose-building-block' && track.blockKind === 'domain-event' ? [track.label] : [],
  )

const countPassing = (
  outcomes: readonly (FacilitationTrack[] | undefined)[],
  predicate: (tracks: FacilitationTrack[]) => boolean,
): number => outcomes.filter((tracks) => tracks !== undefined && predicate(tracks)).length

const printRow = (row: EvalRow): void => {
  console.log(`${row.caseId} ${row.assertion}: ${String(row.passed)}/${String(row.runs)}`)
}

const scoreFixture = (
  fixture: EvalFixture,
  outcomes: readonly (FacilitationTrack[] | undefined)[],
): EvalRow[] => {
  const rows: EvalRow[] = []
  const expectedKind = fixture.expect.kind
  if (expectedKind !== undefined) {
    rows.push({
      caseId: fixture.id,
      assertion: 'kind',
      passed: countPassing(outcomes, (tracks) => proposedKinds(tracks).includes(expectedKind)),
      runs: RUNS,
    })
  }
  if (fixture.expect.pastTense === true) {
    rows.push({
      caseId: fixture.id,
      assertion: 'pastTense',
      passed: countPassing(outcomes, (tracks) => domainEventLabels(tracks).some(isPastTenseLabel)),
      runs: RUNS,
    })
  }
  if (fixture.expect.notFlagPhase === true) {
    rows.push({
      caseId: fixture.id,
      assertion: 'notFlagPhase',
      passed: countPassing(outcomes, (tracks) => !hasFlagPhase(tracks)),
      runs: RUNS,
    })
  }
  if (fixture.expect.sharesContentWord === true) {
    const segment = fixture.contribution.body
    rows.push({
      caseId: fixture.id,
      assertion: 'sharesContentWord',
      passed: countPassing(outcomes, (tracks) =>
        proposedLabels(tracks).some((label) => sharesContentWord(label, segment)),
      ),
      runs: RUNS,
    })
  }
  return rows
}

export const runEval = async (options: RunEvalOptions): Promise<EvalRow[]> => {
  loadEnvironmentFiles()
  requireApiKey()
  mkdirSync(DATA_DIRECTORY, { recursive: true })

  const facilitator = createAnthropicFacilitator({
    dataDirectory: DATA_DIRECTORY,
    clock: systemClock,
  })
  const instructions = buildInstructions()
  const rows: EvalRow[] = []

  for (const fixture of loadFixtures()) {
    const context = facilitationContext({
      scopeStatement: fixture.scopeStatement,
      buildingBlocks: [],
      priorSummaries: [],
      openQuestions: [],
      recentTranscript: [],
    })
    const prompt = buildTurnInput(context, fixture.contribution)
    const outcomes: (FacilitationTrack[] | undefined)[] = []
    for (let run = 0; run < RUNS; run += 1) {
      const result = await facilitator.interpret({ instructions, prompt })
      outcomes.push(isOk(result) ? result.value.interpretation : undefined)
    }
    const scored = scoreFixture(fixture, outcomes)
    for (const row of scored) printRow(row)
    rows.push(...scored)
  }

  if (options.report) {
    const readmePath = 'README.md'
    writeFileSync(readmePath, spliceEvalResults(readFileSync(readmePath, 'utf8'), formatEvalTable(rows)))
  }
  return rows
}

const scriptPath = (process.argv[1] ?? '').replaceAll('\\', '/')
const invokedAsCli = scriptPath.endsWith('eval/run.ts') || scriptPath.endsWith('eval/run.js')

if (invokedAsCli) {
  try {
    await runEval({ report: process.argv.includes('--report') })
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
