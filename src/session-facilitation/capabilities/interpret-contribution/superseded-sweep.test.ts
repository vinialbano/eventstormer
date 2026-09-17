import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { ContributionId, ProposalId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import { applyOperation, Operation } from '../../../domain-model-capture/api.ts'
import type { DerivedTrackDb } from '../../infrastructure/derived-track.ts'
import { applySessionFacilitationMigrations } from '../../infrastructure/migrations.ts'
import { close, reserve, type SessionIndexDb } from '../../infrastructure/session-index.ts'
import { proposalStream, sessionStream, workshopStream } from '../../infrastructure/streams.ts'
import { ProposalEvent } from '../../domain/schema/events.ts'
import { createInFlightGuard } from './in-flight.ts'
import { supersededRewordSweep } from './superseded-sweep.ts'
import type { InterpretContributionDeps } from './deps.ts'

const at = '2026-08-30T12:00:00.000Z'
const clock = () => at
const workshopId = 'w_1' as WorkshopId
const sessionId = 's_1' as SessionId
const author = { proposer: { name: 'facilitator' }, accepter: { name: 'Dana' } }

let store: EventStore
let db: SessionIndexDb & DerivedTrackDb

const deps = (): InterpretContributionDeps => ({
  store,
  db,
  clock,
  facilitator: { interpret: () => Promise.reject(new Error('no')), askOpening: () => Promise.reject(new Error('no')) },
  inFlight: createInFlightGuard(),
  mint: {
    proposalId: () => 'p_x' as ProposalId,
    questionId: () => 'q_x' as never,
    resolutionId: () => 'r_x' as never,
  },
})

const captureBlock = (id: string, label: string): void => {
  const result = applyOperation({ store, clock }, workshopId, Operation.parse({ author, kind: 'capture-domain-event', id, label }))
  if (!result.ok) throw new Error(`capture failed: ${result.error.kind}`)
}

const rewordBoard = (target: string, label: string): void => {
  const result = applyOperation({ store, clock }, workshopId, Operation.parse({ author, kind: 'reword', target, label }))
  if (!result.ok) throw new Error(`reword failed: ${result.error.kind}`)
}

/** An APPLIED reword model-change proposal + its interpreted track. */
const seedAppliedReword = (
  proposalId: string,
  target: string,
  newLabel: string,
  contributionId = 'c_1',
): void => {
  store.append(sessionStream(sessionId), store.read(sessionStream(sessionId)).length - 1, [
    {
      at,
      opVersion: 1,
      operation: {
        v: 1,
        at,
        type: 'Contribution Interpreted',
        sessionId,
        contributionId,
        tracks: [
          {
            track: 'propose-reword',
            proposalId,
            target,
            newLabel,
            heldBack: false,
            targetLabel: 'the old label',
          },
        ],
      },
    },
  ])
  store.append(proposalStream(proposalId as ProposalId), -1, [
    {
      at,
      opVersion: 1,
      operation: {
        v: 1,
        at,
        type: 'Model Change Proposed',
        proposalId,
        sessionId,
        contributionId,
        intent: { kind: 'reword', target, newLabel },
      },
    },
    { at, opVersion: 1, operation: { v: 1, at, type: 'Proposal Accepted', proposalId, accepter: 'Dana' } },
    {
      at,
      opVersion: 1,
      operation: { v: 1, at, type: 'Operation Applied', proposalId, resultingBuildingBlockId: target },
    },
  ])
}

const proposalTypes = (proposalId: string): string[] =>
  store
    .read(proposalStream(proposalId as ProposalId))
    .map((row) => ProposalEvent.parse(row.operation).type)

const supersededEvent = (proposalId: string) =>
  store
    .read(proposalStream(proposalId as ProposalId))
    .map((row) => ProposalEvent.parse(row.operation))
    .find((event) => event.type === 'Model Change Superseded')

beforeEach(() => {
  const raw = new DatabaseSync(':memory:')
  applySessionFacilitationMigrations(raw)
  db = raw
  store = createMemoryEventStore()
  store.append(workshopStream(workshopId), -1, [
    {
      at,
      opVersion: 1,
      operation: { v: 1, type: 'Workshop Started', workshopId, format: 'big-picture', creatorName: 'Dana', at },
    },
  ])
  store.append(sessionStream(sessionId), -1, [
    { at, opVersion: 1, operation: { v: 1, type: 'Session Started', sessionId, workshopId, at } },
  ])
  reserve(db, workshopId, sessionId, at)
})

describe('supersededRewordSweep', () => {
  it('marks the earlier of two rewords on one target when the board carries the later label', () => {
    captureBlock('bb_a', 'order goes in')
    seedAppliedReword('p_1', 'bb_a', 'order goes in')
    // a later reword wins on the board
    rewordBoard('bb_a', 'order placed')

    supersededRewordSweep(deps())

    expect(proposalTypes('p_1').at(-1)).toBe('Model Change Superseded')
    expect(supersededEvent('p_1')).toMatchObject({ target: 'bb_a', supersededByLabel: 'order placed' })
  })

  it('a second sweep is a no-op — the marker-present guard holds', () => {
    captureBlock('bb_a', 'order goes in')
    seedAppliedReword('p_1', 'bb_a', 'order goes in')
    rewordBoard('bb_a', 'order placed')

    supersededRewordSweep(deps())
    const lengthAfterFirst = store.read(proposalStream('p_1' as ProposalId)).length
    supersededRewordSweep(deps())

    expect(store.read(proposalStream('p_1' as ProposalId)).length).toBe(lengthAfterFirst)
  })

  it('does not mark a reword whose newLabel still matches the board label', () => {
    captureBlock('bb_a', 'order placed')
    seedAppliedReword('p_1', 'bb_a', 'order placed')

    supersededRewordSweep(deps())

    expect(supersededEvent('p_1')).toBeUndefined()
    expect(proposalTypes('p_1')).not.toContain('Model Change Superseded')
  })

  it('skips a closed session — the open-sessions-only bound', () => {
    captureBlock('bb_a', 'order goes in')
    seedAppliedReword('p_1', 'bb_a', 'order goes in')
    rewordBoard('bb_a', 'order placed')
    close(db, sessionId, at)

    supersededRewordSweep(deps())

    expect(supersededEvent('p_1')).toBeUndefined()
  })

  it('leaves a not-yet-APPLIED reword proposal alone', () => {
    captureBlock('bb_a', 'order goes in')
    rewordBoard('bb_a', 'order placed')
    // interpreted track + birth, but no Operation Applied yet
    store.append(sessionStream(sessionId), store.read(sessionStream(sessionId)).length - 1, [
      {
        at,
        opVersion: 1,
        operation: {
          v: 1,
          at,
          type: 'Contribution Interpreted',
          sessionId,
          contributionId: 'c_1' as ContributionId,
          tracks: [
            { track: 'propose-reword', proposalId: 'p_1', target: 'bb_a', newLabel: 'order goes in', heldBack: false, targetLabel: 'x' },
          ],
        },
      },
    ])
    store.append(proposalStream('p_1' as ProposalId), -1, [
      {
        at,
        opVersion: 1,
        operation: {
          v: 1,
          at,
          type: 'Model Change Proposed',
          proposalId: 'p_1',
          sessionId,
          contributionId: 'c_1',
          intent: { kind: 'reword', target: 'bb_a', newLabel: 'order goes in' },
        },
      },
    ])

    supersededRewordSweep(deps())

    expect(supersededEvent('p_1')).toBeUndefined()
  })
})
