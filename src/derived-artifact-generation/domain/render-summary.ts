import type { BuildingBlockId } from '~/plumbing/ids.ts'
import { byId, connectedComponents, longestPathRanks, undirectedNeighbours } from './graph.ts'
import type { AccountFollowsEdge } from './model.ts'
import { kindWord } from './render-readable-account.ts'

/**
 * `renderSummary` — the deterministic F10 model outline. A pure template over the
 * Board snapshot plus the workshop record: no language-model call, no quoted
 * evidence (no contribution body, stored rationale, or evidence span), and no
 * external-documentation-toolchain claim. Every section renders an explicit
 * empty / "not run" line so a reader can tell a skipped format step from one
 * that ran and found nothing. Ordered sections (the spine, the branch points)
 * are pinned to the total order `(rank, id)` so two renders of the same model
 * are byte-identical regardless of operation-log insertion order.
 *
 * The input shapes are declared locally: this `domain/` module imports
 * `plumbing/` only, and the capability seam binds the real `BoardSnapshot` /
 * `ArtifactSource` types.
 */

interface SummaryBlock {
  id: BuildingBlockId
  kind: 'domain-event' | 'actor' | 'system' | 'hot-spot'
  label: string
  withdrawn: boolean
  placement: 'backlog' | 'timeline'
  pivotal: boolean
}

interface SummarySnapshot {
  blocks: readonly SummaryBlock[]
  follows: readonly AccountFollowsEdge[]
  causedBy: readonly { cause: BuildingBlockId; effect: BuildingBlockId }[]
}

type SummaryStakeholderCheck =
  | { run: false }
  | { run: true; complete: boolean; absentNames: readonly string[] }

type SummaryChosenProblem =
  | { notRun: true }
  | { skipped: true; reason: 'none-chosen' | 'no-impediments-yet' }
  | { chosen: true; hotSpotId: string; label: string; qualification: 'firm' | 'provisional' }

interface SummaryWorkshop {
  format: 'big-picture'
  scope: string | null
  narratorCount: number
  stakeholderCheck: SummaryStakeholderCheck
  chosenProblem: SummaryChosenProblem
  openModelAffectingHotSpots: readonly { id: string; label: string }[]
}

export interface SummaryInput {
  snapshot: SummarySnapshot
  source: SummaryWorkshop
  boardPosition: number
  sessionRecordPosition: number
  renderedAt: string
}

const placedDomainEvents = (blocks: readonly SummaryBlock[]): SummaryBlock[] =>
  blocks.filter(
    (block) =>
      block.kind === 'domain-event' && block.placement === 'timeline' && !block.withdrawn,
  )

const domainEvents = (blocks: readonly SummaryBlock[]): SummaryBlock[] =>
  blocks.filter((block) => block.kind === 'domain-event' && !block.withdrawn)

const eventLine = (block: SummaryBlock): string => `- ${kindWord('domain-event')}: ${block.label}`

interface Structure {
  ranks: Record<string, number>
  follows: AccountFollowsEdge[]
  trackCount: number
  order: (left: string, right: string) => number
}

const structureOf = (snapshot: SummarySnapshot): Structure => {
  const placed = placedDomainEvents(snapshot.blocks)
  const eligible = new Set(placed.map((block) => block.id))
  const follows = snapshot.follows.filter(
    (edge) => eligible.has(edge.predecessor) && eligible.has(edge.successor),
  )
  const ranks = longestPathRanks([...eligible], follows)
  const trackCount =
    eligible.size === 0
      ? 0
      : connectedComponents(eligible, undirectedNeighbours(eligible, follows)).length
  const order = (left: string, right: string): number => {
    const rankDiff = (ranks[left] ?? 0) - (ranks[right] ?? 0)
    return rankDiff !== 0 ? rankDiff : byId(left, right)
  }
  return { ranks, follows, trackCount, order }
}

const spineSection = (snapshot: SummarySnapshot, structure: Structure): string => {
  const pivotal = snapshot.blocks
    .filter((block) => block.kind === 'domain-event' && !block.withdrawn && block.pivotal)
    .toSorted((left, right) => structure.order(left.id, right.id))
  const lines =
    pivotal.length === 0 ? ['- (no pivotal marks)'] : pivotal.map(eventLine)
  return ['## Spine', ...lines].join('\n')
}

const branchPoints = (snapshot: SummarySnapshot, structure: Structure): SummaryBlock[] => {
  const outgoing = new Map<string, Set<string>>()
  for (const edge of structure.follows) {
    const set = outgoing.get(edge.predecessor) ?? new Set<string>()
    set.add(edge.successor)
    outgoing.set(edge.predecessor, set)
  }
  const byBlockId = new Map(snapshot.blocks.map((block) => [block.id, block]))
  return [...outgoing.entries()]
    .filter(([, successors]) => successors.size >= 2)
    .map(([id]) => byBlockId.get(id as BuildingBlockId))
    .filter((block): block is SummaryBlock => block !== undefined)
    .toSorted((left, right) => structure.order(left.id, right.id))
}

const shapeSection = (snapshot: SummarySnapshot, structure: Structure): string => {
  const count = (kind: SummaryBlock['kind']): number =>
    snapshot.blocks.filter((block) => block.kind === kind && !block.withdrawn).length
  const events = domainEvents(snapshot.blocks)
  const placed = events.filter((block) => block.placement === 'timeline').length
  const backlog = events.length - placed
  const points = branchPoints(snapshot, structure)
  const pointLines =
    points.length === 0 ? [] : points.map((block) => `  ${eventLine(block)}`)
  return [
    '## Shape',
    `- Domain events: ${String(events.length)} (placed ${String(placed)}, backlog ${String(backlog)})`,
    `- Actors: ${String(count('actor'))}`,
    `- Systems: ${String(count('system'))}`,
    `- Hot spots: ${String(count('hot-spot'))}`,
    `- Disconnected tracks: ${String(structure.trackCount)}`,
    `- Branch points: ${String(points.length)}`,
    ...pointLines,
  ].join('\n')
}

const stakeholderLine = (check: SummaryStakeholderCheck): string => {
  if (!check.run) return '- Stakeholder check: not run'
  if (check.complete) return '- Stakeholder check: run (complete)'
  const absent = [...check.absentNames].toSorted(byId)
  const suffix = absent.length === 0 ? '' : `; absent: ${absent.join(', ')}`
  return `- Stakeholder check: run (incomplete${suffix})`
}

const chosenProblemLine = (problem: SummaryChosenProblem): string => {
  if ('notRun' in problem) return '- Chosen problem: not run'
  if ('skipped' in problem) return `- Chosen problem: skipped: ${problem.reason}`
  return `- Chosen problem: "${problem.label}" (${problem.qualification})`
}

const formatStepsSection = (source: SummaryWorkshop): string =>
  ['## Format steps', stakeholderLine(source.stakeholderCheck), chosenProblemLine(source.chosenProblem)].join(
    '\n',
  )

const openProblemsSection = (source: SummaryWorkshop): string => {
  const hotSpots = [...source.openModelAffectingHotSpots].toSorted((left, right) =>
    byId(left.id, right.id),
  )
  const hotSpotLines =
    hotSpots.length === 0
      ? ['- Open model-affecting hot spots: none']
      : ['- Open model-affecting hot spots:', ...hotSpots.map((spot) => `  - ${spot.label}`)]
  return ['## Open problems', chosenProblemLine(source.chosenProblem), ...hotSpotLines].join('\n')
}

const coverageGapsSection = (snapshot: SummarySnapshot): string => {
  const events = domainEvents(snapshot.blocks)
  const hasCause = new Set(snapshot.causedBy.map((edge) => edge.effect))
  const noCause = events
    .filter((block) => !hasCause.has(block.id))
    .toSorted((left, right) => byId(left.id, right.id))
  const unplaced = events
    .filter((block) => block.placement === 'backlog')
    .toSorted((left, right) => byId(left.id, right.id))
  const block = (heading: string, blocks: SummaryBlock[]): string[] =>
    blocks.length === 0
      ? [`- ${heading}: none`]
      : [`- ${heading}:`, ...blocks.map((event) => `  ${eventLine(event)}`)]
  return [
    '## Coverage gaps',
    ...block('Events with no recorded cause', noCause),
    ...block('Unplaced events', unplaced),
  ].join('\n')
}

export const renderSummary = (
  input: SummaryInput,
): { markdown: string; boardPosition: number; sessionRecordPosition: number } => {
  const boardPosition = input.boardPosition < 0 ? 0 : input.boardPosition
  const structure = structureOf(input.snapshot)
  const scope = input.source.scope ?? '(not set)'
  const markdown = `# Model summary
Format: Big Picture
Contributors: ${String(input.source.narratorCount)}
Scope: ${scope}
Board position: ${String(boardPosition)}
Session-record position: ${String(input.sessionRecordPosition)}
Rendered at: ${input.renderedAt}

${formatStepsSection(input.source)}

${spineSection(input.snapshot, structure)}

${shapeSection(input.snapshot, structure)}

${openProblemsSection(input.source)}

${coverageGapsSection(input.snapshot)}
`
  return { markdown, boardPosition, sessionRecordPosition: input.sessionRecordPosition }
}
