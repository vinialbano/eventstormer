import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { systemClock } from '~/plumbing/clock.ts'
import { isOk } from '~/plumbing/result.ts'
import { createAnthropicFacilitator } from '~/session-facilitation/api.ts'
import {
  type FacilitationBlock,
  facilitationContext,
} from '~/session-facilitation/domain/read-models/facilitation.ts'
import { InterpretedRelationKind } from '~/session-facilitation/domain/schema/interpreted-track.ts'
import {
  attributesToFormat,
  flagsPhase,
  hasFlagPhase,
  isPastTenseLabel,
  proposedKinds,
  proposesPivotal,
  proposesRelation,
  proposesReword,
  sharesContentWord,
} from '~/session-facilitation/infrastructure/facilitator/eval-oracles.ts'
import { buildInstructions, buildTurnInput } from '~/session-facilitation/infrastructure/facilitator/prompt.ts'
import type { FacilitationTrack } from '~/session-facilitation/infrastructure/facilitator/turn-schema.ts'
import { formatEvalTable, spliceEvalResults } from './report.ts'

const RUNS = 5
const DATA_DIRECTORY = 'eval-runs'
const FIXTURE_FILES = [
  'kind.json',
  'past-tense.json',
  'near-miss.json',
  'kept-phrasing.json',
  'phase-flagged.json',
  'deeper-format.json',
  'relation.json',
  'pivotal.json',
  'reword.json',
  'integration-relation.json',
  'integration-pivotal.json',
] as const

const BLOCK_KINDS = new Set(['domain-event', 'actor', 'system'])
const RELATION_KINDS = new Set<string>(InterpretedRelationKind.options)
const PIVOTAL_KINDS = new Set(['mark-pivotal', 'unmark-pivotal'])

export interface EvalExpect {
  kind?: 'domain-event' | 'actor' | 'system'
  pastTense?: true
  notFlagPhase?: true
  sharesContentWord?: true
  phaseFlagged?: true
  attributesToFormat?: string
  relation?: { kind: InterpretedRelationKind; labels: string[] }
  pivotal?: { kind: 'mark-pivotal' | 'unmark-pivotal'; label: string }
  reword?: { from: string; to: string }
}

export interface EvalFixture {
  id: string
  scopeStatement: string
  contribution: { speaker: string; body: string }
  /** Board labels folded into `facilitationContext.buildingBlocks` as placed domain events, so the readiness gates let the model propose relations / pivotal marks / rewords. */
  priorBlocks?: string[]
  /** `priorBlocks` labels to mark pivotal — establishes model structure for the AD-036 reword gate, and satisfies `pivotalProposable` alongside a `priorBlocks` count ≥ 5. */
  priorPivotal?: string[]
  /** `[predecessor, successor]` label pairs among `priorBlocks` — establishes a `follows` edge so the AD-036 reword gate opens. */
  priorFollows?: [string, string][]
  expect: EvalExpect
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

/** The fixture's `priorBlocks` as `facilitationContext` building blocks — folded as placed
 * domain events, carrying any `priorPivotal` mark and `priorFollows` edge so the readiness
 * gates (AD-036) let the model propose a relation / pivotal mark / reword. */
export const priorBuildingBlocks = (fixture: EvalFixture): FacilitationBlock[] => {
  const pivotal = new Set(fixture.priorPivotal ?? [])
  const followedBy = new Map<string, string[]>()
  for (const [predecessor, successor] of fixture.priorFollows ?? []) {
    followedBy.set(predecessor, [...(followedBy.get(predecessor) ?? []), successor])
  }
  return (fixture.priorBlocks ?? []).map((label): FacilitationBlock => {
    const successors = followedBy.get(label)
    return {
      kind: 'domain-event',
      label,
      placement: 'timeline',
      ...(pivotal.has(label) ? { pivotal: true } : {}),
      ...(successors === undefined ? {} : { followedBy: successors }),
    }
  })
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseContribution = (value: unknown): EvalFixture['contribution'] => {
  if (!isRecord(value) || typeof value.speaker !== 'string' || typeof value.body !== 'string') {
    throw new Error('eval fixture contribution must have speaker and body strings')
  }
  return { speaker: value.speaker, body: value.body }
}

const nonEmptyString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`eval fixture ${field} must be a non-empty string`)
  }
  return value
}

const parseLabelArray = (value: unknown, field: string): string[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`eval fixture ${field} must be a non-empty array of labels`)
  }
  return value.map((entry, index) => nonEmptyString(entry, `${field}[${String(index)}]`))
}

const parseFollowsArray = (value: unknown): [string, string][] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('eval fixture priorFollows must be a non-empty array of [predecessor, successor] pairs')
  }
  return value.map((entry, index): [string, string] => {
    if (!Array.isArray(entry) || entry.length !== 2) {
      throw new Error(`eval fixture priorFollows[${String(index)}] must be a [predecessor, successor] pair`)
    }
    return [
      nonEmptyString(entry[0], `priorFollows[${String(index)}][0]`),
      nonEmptyString(entry[1], `priorFollows[${String(index)}][1]`),
    ]
  })
}

const parseRelation = (value: unknown): NonNullable<EvalExpect['relation']> => {
  if (!isRecord(value) || typeof value.kind !== 'string' || !RELATION_KINDS.has(value.kind)) {
    throw new Error('eval fixture expect.relation.kind must be a valid relation kind')
  }
  return { kind: value.kind as InterpretedRelationKind, labels: parseLabelArray(value.labels, 'expect.relation.labels') }
}

const parsePivotal = (value: unknown): NonNullable<EvalExpect['pivotal']> => {
  if (!isRecord(value) || typeof value.kind !== 'string' || !PIVOTAL_KINDS.has(value.kind)) {
    throw new Error('eval fixture expect.pivotal.kind must be mark-pivotal or unmark-pivotal')
  }
  return { kind: value.kind as 'mark-pivotal' | 'unmark-pivotal', label: nonEmptyString(value.label, 'expect.pivotal.label') }
}

const parseReword = (value: unknown): NonNullable<EvalExpect['reword']> => {
  if (!isRecord(value)) throw new Error('eval fixture expect.reword must be an object')
  return {
    from: nonEmptyString(value.from, 'expect.reword.from'),
    to: nonEmptyString(value.to, 'expect.reword.to'),
  }
}

const parseExpect = (value: unknown): EvalExpect => {
  if (!isRecord(value)) throw new Error('eval fixture expect must be an object')
  const parsed: EvalExpect = {}
  if (value.kind !== undefined) {
    if (typeof value.kind !== 'string' || !BLOCK_KINDS.has(value.kind)) {
      throw new Error('eval fixture expect.kind must be domain-event, actor, or system')
    }
    parsed.kind = value.kind as 'domain-event' | 'actor' | 'system'
  }
  if (value.pastTense === true) parsed.pastTense = true
  if (value.notFlagPhase === true) parsed.notFlagPhase = true
  if (value.sharesContentWord === true) parsed.sharesContentWord = true
  if (value.phaseFlagged === true) parsed.phaseFlagged = true
  if (value.attributesToFormat !== undefined) {
    parsed.attributesToFormat = nonEmptyString(value.attributesToFormat, 'expect.attributesToFormat')
  }
  if (value.relation !== undefined) parsed.relation = parseRelation(value.relation)
  if (value.pivotal !== undefined) parsed.pivotal = parsePivotal(value.pivotal)
  if (value.reword !== undefined) parsed.reword = parseReword(value.reword)
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
    ...(value.priorBlocks === undefined
      ? {}
      : { priorBlocks: parseLabelArray(value.priorBlocks, 'priorBlocks') }),
    ...(value.priorPivotal === undefined
      ? {}
      : { priorPivotal: parseLabelArray(value.priorPivotal, 'priorPivotal') }),
    ...(value.priorFollows === undefined
      ? {}
      : { priorFollows: parseFollowsArray(value.priorFollows) }),
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

/** Parse one fixture's raw JSON, prefixing any failure with the file name. */
export const parseFixtureFile = (file: string, raw: string): EvalFixture => {
  try {
    return parseFixture(JSON.parse(raw) as unknown)
  } catch (error) {
    throw new Error(`${file}: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
    })
  }
}

export const loadFixtures = (): EvalFixture[] => {
  const directory = join(import.meta.dirname, 'fixtures')
  return FIXTURE_FILES.map((file) =>
    parseFixtureFile(file, readFileSync(join(directory, file), 'utf8')),
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

export const scoreFixture = (
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
  if (fixture.expect.phaseFlagged === true) {
    rows.push({
      caseId: fixture.id,
      assertion: 'phaseFlagged',
      passed: countPassing(outcomes, (tracks) => flagsPhase(tracks)),
      runs: RUNS,
    })
  }
  const expectedFormat = fixture.expect.attributesToFormat
  if (expectedFormat !== undefined) {
    rows.push({
      caseId: fixture.id,
      assertion: 'attributesToFormat',
      passed: countPassing(outcomes, (tracks) => attributesToFormat(tracks, expectedFormat)),
      runs: RUNS,
    })
  }
  const expectedRelation = fixture.expect.relation
  if (expectedRelation !== undefined) {
    rows.push({
      caseId: fixture.id,
      assertion: 'relation',
      passed: countPassing(outcomes, (tracks) => proposesRelation(tracks, expectedRelation)),
      runs: RUNS,
    })
  }
  const expectedPivotal = fixture.expect.pivotal
  if (expectedPivotal !== undefined) {
    rows.push({
      caseId: fixture.id,
      assertion: 'pivotal',
      passed: countPassing(outcomes, (tracks) => proposesPivotal(tracks, expectedPivotal)),
      runs: RUNS,
    })
  }
  const expectedReword = fixture.expect.reword
  if (expectedReword !== undefined) {
    rows.push({
      caseId: fixture.id,
      assertion: 'reword',
      passed: countPassing(outcomes, (tracks) => proposesReword(tracks, expectedReword)),
      runs: RUNS,
    })
  }
  return rows
}

/** Every F11 facilitator assertion the eval can score — the fixture set must cover each. */
export const F11_ASSERTIONS = [
  'kind',
  'pastTense',
  'notFlagPhase',
  'sharesContentWord',
  'phaseFlagged',
  'attributesToFormat',
  'relation',
  'pivotal',
  'reword',
] as const

/** F11 assertions with no fixture declaring them — empty when the set is complete. */
export const uncoveredF11Assertions = (fixtures: readonly EvalFixture[]): string[] => {
  const declared = new Set(fixtures.flatMap((fixture) => Object.keys(fixture.expect)))
  return F11_ASSERTIONS.filter((assertion) => !declared.has(assertion))
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
      buildingBlocks: priorBuildingBlocks(fixture),
      timelineEventCount: fixture.priorBlocks?.length ?? 0,
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
