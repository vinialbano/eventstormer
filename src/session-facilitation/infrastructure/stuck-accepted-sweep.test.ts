import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryEventStore } from '~/plumbing/event-store/memory-store.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import type { ContributionId, ProposalId, ResolutionId, SessionId, WorkshopId } from '~/plumbing/ids.ts'
import * as domainModelCaptureApi from '../../domain-model-capture/api.ts'
import { applyOperation, Operation } from '../../domain-model-capture/api.ts'
import { ProposalEvent, ResolutionEvent } from '../domain/schema/events.ts'
import { proposalStream, resolutionStream, sessionStream, workshopStream } from './streams.ts'
import { sweepStuckAccepted } from './stuck-accepted-sweep.ts'

const at = '2026-08-30T12:00:00.000Z'
const clock = () => at
const workshopId = 'w_1' as WorkshopId
const sessionId = 's_1' as SessionId
const author = { proposer: { name: 'facilitator' }, accepter: { name: 'Dana' } }

let store: EventStore
const deps = () => ({ store, clock })

const seedWorkshopAndSession = (): void => {
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
}

const closeSession = (): void => {
  store.append(sessionStream(sessionId), store.read(sessionStream(sessionId)).length - 1, [
    {
      at,
      opVersion: 1,
      operation: { v: 1, type: 'Session Closed', sessionId, workshopId, unresolvedQuestionIds: [], at },
    },
  ])
}

/** A `Proposal` stuck `ACCEPTED` with a minted `buildingBlockId` — the state a
 * crash between the board append and the outcome append leaves behind. */
const seedStuckAcceptedProposal = (proposalId: string, buildingBlockId: string, label: string): void => {
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
          {
            track: 'propose-building-block',
            proposalId,
            blockKind: 'domain-event',
            label,
            bar: 'strict',
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
        type: 'Building Block Proposed',
        proposalId,
        sessionId,
        contributionId: 'c_1',
        blockKind: 'domain-event',
        label,
        bar: 'strict',
      },
    },
    {
      at,
      opVersion: 1,
      operation: { v: 1, at, type: 'Proposal Accepted', proposalId, accepter: 'Dana', buildingBlockId },
    },
  ])
}

/** A `Resolution` stuck `ACCEPTED` for a hot spot already on the board. */
const seedStuckAcceptedResolution = (resolutionId: string, hotSpotId: string, reference: string): void => {
  store.append(sessionStream(sessionId), store.read(sessionStream(sessionId)).length - 1, [
    {
      at,
      opVersion: 1,
      operation: {
        v: 1,
        at,
        type: 'Contribution Interpreted',
        sessionId,
        contributionId: 'c_2' as ContributionId,
        tracks: [{ track: 'propose-resolution', resolutionId, hotSpotId, reference }],
      },
    },
  ])
  store.append(resolutionStream(resolutionId as ResolutionId), -1, [
    {
      at,
      opVersion: 1,
      operation: { v: 1, at, type: 'Resolution Proposed', resolutionId, sessionId, contributionId: 'c_2', hotSpotId, reference },
    },
    { at, opVersion: 1, operation: { v: 1, at, type: 'Resolution Accepted', resolutionId, accepter: 'Dana' } },
  ])
}

const proposalTypes = (proposalId: string): string[] =>
  store.read(proposalStream(proposalId as ProposalId)).map((row) => ProposalEvent.parse(row.operation).type)

const proposalDisposition = (proposalId: string): string | undefined => {
  const last = proposalTypes(proposalId).at(-1)
  return last === undefined
    ? undefined
    : { 'Operation Applied': 'APPLIED', 'Proposal Accepted': 'ACCEPTED', 'Operation Rejected': 'APPLY_FAILED' }[last]
}

const resolutionTypes = (resolutionId: string): string[] =>
  store.read(resolutionStream(resolutionId as ResolutionId)).map((row) => ResolutionEvent.parse(row.operation).type)

const resolutionDisposition = (resolutionId: string): string | undefined => {
  const last = resolutionTypes(resolutionId).at(-1)
  return last === undefined
    ? undefined
    : {
        'Resolution Accepted': 'ACCEPTED',
        'Hot Spot Resolved': 'APPLIED',
        'Resolution Superseded': 'APPLIED',
        'Hot Spot Resolution Rejected': 'LAPSED',
      }[last]
}

beforeEach(() => {
  store = createMemoryEventStore()
  seedWorkshopAndSession()
})

describe('sweepStuckAccepted', () => {
  it('re-drives a proposal stuck ACCEPTED by a lost outcome append to APPLIED', () => {
    seedStuckAcceptedProposal('p_1', 'bb_1', 'Book borrowed')
    // fault injection: the board append landed, but the outcome append never ran
    const captured = applyOperation(
      deps(),
      workshopId,
      Operation.parse({ kind: 'capture-domain-event', id: 'bb_1', label: 'Book borrowed', author }),
    )
    expect(captured.ok).toBe(true)

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    sweepStuckAccepted(deps(), sessionId)

    expect(proposalDisposition('p_1')).toBe('APPLIED')
    expect(proposalTypes('p_1')).toEqual(['Building Block Proposed', 'Proposal Accepted', 'Operation Applied'])
    expect(infoSpy).toHaveBeenCalledWith('stuck-accepted-sweep: re-driving proposal p_1')
    infoSpy.mockRestore()
  })

  it('re-drives a resolution stuck ACCEPTED by a lost outcome append to APPLIED', () => {
    const raised = applyOperation(
      deps(),
      workshopId,
      Operation.parse({ kind: 'raise-hot-spot', id: 'h_1', label: 'Hot spot', author }),
    )
    expect(raised.ok).toBe(true)
    seedStuckAcceptedResolution('r_1', 'h_1', 'fixed it')
    // fault injection: the board resolve landed, but the outcome append never ran
    const resolved = applyOperation(
      deps(),
      workshopId,
      Operation.parse({ kind: 'resolve', target: 'h_1', reference: 'fixed it', author }),
    )
    expect(resolved.ok).toBe(true)

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    sweepStuckAccepted(deps(), sessionId)

    expect(resolutionDisposition('r_1')).toBe('APPLIED')
    expect(resolutionTypes('r_1')).toEqual(['Resolution Proposed', 'Resolution Accepted', 'Hot Spot Resolved'])
    expect(infoSpy).toHaveBeenCalledWith('stuck-accepted-sweep: re-driving resolution r_1')
    infoSpy.mockRestore()
  })

  it('a second sweep on an already-resolved stream is a no-op', () => {
    seedStuckAcceptedProposal('p_1', 'bb_1', 'Book borrowed')
    applyOperation(
      deps(),
      workshopId,
      Operation.parse({ kind: 'capture-domain-event', id: 'bb_1', label: 'Book borrowed', author }),
    )
    vi.spyOn(console, 'info').mockImplementation(() => undefined)

    sweepStuckAccepted(deps(), sessionId)
    const lengthAfterFirst = store.read(proposalStream('p_1' as ProposalId)).length
    sweepStuckAccepted(deps(), sessionId)

    expect(store.read(proposalStream('p_1' as ProposalId)).length).toBe(lengthAfterFirst)
    expect(proposalDisposition('p_1')).toBe('APPLIED')
    vi.restoreAllMocks()
  })

  it('isolates a re-drive that throws — the other stuck candidate in the same session still gets swept', () => {
    seedStuckAcceptedProposal('p_1', 'bb_1', 'Book borrowed')
    const raised = applyOperation(
      deps(),
      workshopId,
      Operation.parse({ kind: 'raise-hot-spot', id: 'h_1', label: 'Hot spot', author }),
    )
    expect(raised.ok).toBe(true)
    seedStuckAcceptedResolution('r_1', 'h_1', 'fixed it')
    applyOperation(
      deps(),
      workshopId,
      Operation.parse({ kind: 'resolve', target: 'h_1', reference: 'fixed it', author }),
    )

    // fault injection: re-driving p_1 throws (mirrors applyOperation's
    // exceeded-retry-budget throw) — r_1 must still be swept in the same pass.
    const spy = vi.spyOn(domainModelCaptureApi, 'applyOperation').mockImplementationOnce(() => {
      throw new Error('applyOperation: exceeded stale-position retry budget')
    })
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    sweepStuckAccepted(deps(), sessionId)

    expect(errorSpy).toHaveBeenCalledWith(
      'stuck-accepted-sweep: proposal p_1 re-drive threw',
      expect.any(Error),
    )
    expect(proposalDisposition('p_1')).toBe('ACCEPTED')
    expect(resolutionDisposition('r_1')).toBe('APPLIED')
    spy.mockRestore()
    infoSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('leaves a stream ACCEPTED for a closed session and logs a warning', () => {
    seedStuckAcceptedProposal('p_1', 'bb_1', 'Book borrowed')
    applyOperation(
      deps(),
      workshopId,
      Operation.parse({ kind: 'capture-domain-event', id: 'bb_1', label: 'Book borrowed', author }),
    )
    closeSession()

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    sweepStuckAccepted(deps(), sessionId)

    expect(proposalDisposition('p_1')).toBe('ACCEPTED')
    expect(warnSpy).toHaveBeenCalledWith('stuck-accepted-sweep: proposal p_1 still ACCEPTED after re-drive')
    infoSpy.mockRestore()
    warnSpy.mockRestore()
  })
})
