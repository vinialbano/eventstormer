import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { BuildingBlockId, ContributionId, ProposalId, SessionId } from '~/plumbing/ids.ts'
import { isOk } from '~/plumbing/result.ts'
import { decide } from './decide.ts'
import { evolve } from './evolve.ts'
import { type Disposition, emptyProposal, type ProposalCommand, TERMINAL } from './model.ts'

const at = '2026-08-30T12:00:00.000Z'
const proposalId = 'p_1' as ProposalId

const VALID: ReadonlySet<Disposition> = new Set<Disposition>([
  'PROPOSED',
  'EDITED',
  'ACCEPTED',
  'APPLIED',
  'APPLY_FAILED',
  'REJECTED',
  'LAPSED',
])

const command = (bbId: string): fc.Arbitrary<ProposalCommand> =>
  fc.oneof(
    fc.constant<ProposalCommand>({
      type: 'Propose Building Block',
      proposalId: proposalId,
      sessionId: 's_1' as SessionId,
      contributionId: 'c_1' as ContributionId,
      blockKind: 'domain-event',
      label: 'x',
      bar: 'strict',
      at,
    }),
    fc.constant<ProposalCommand>({ type: 'Edit Proposal', proposalId: proposalId, label: 'y', at }),
    fc.constant<ProposalCommand>({
      type: 'Accept Proposal',
      proposalId: proposalId,
      accepter: 'Dana',
      buildingBlockId: bbId as BuildingBlockId,
      at,
    }),
    fc.constant<ProposalCommand>({ type: 'Reject Proposal', proposalId: proposalId, at }),
    fc.constant<ProposalCommand>({ type: 'Hold Proposal', proposalId: proposalId, at }),
    fc.constant<ProposalCommand>({ type: 'Unhold Proposal', proposalId: proposalId, at }),
    fc.constant<ProposalCommand>({
      type: 'Record Operation Applied',
      proposalId: proposalId,
      resultingBuildingBlockId: 'b_applied' as BuildingBlockId,
      at,
    }),
    fc.constant<ProposalCommand>({
      type: 'Record Operation Rejected',
      proposalId: proposalId,
      reason: 'r',
      at,
    }),
    fc.constant<ProposalCommand>({ type: 'Lapse Proposal', proposalId: proposalId, cause: 'undisposed', at }),
  )

describe('Proposal disposition machine — property', () => {
  it('no command sequence reaches an illegal transition', () => {
    fc.assert(
      fc.property(fc.array(command('b_1'), { maxLength: 40 }), (cmds) => {
        let writeModel = emptyProposal()
        let mintedId: BuildingBlockId | undefined

        for (const nextCommand of cmds) {
          const wasTerminal = TERMINAL.has(writeModel.disposition)
          const result = decide(writeModel, nextCommand)

          if (isOk(result)) {
            // A terminal proposal never produces a further event.
            if (wasTerminal) expect(result.value).toEqual([])
            for (const event of result.value) writeModel = evolve(writeModel, event)
          }

          expect(VALID.has(writeModel.disposition)).toBe(true)

          // Once minted, the buildingBlockId is stable for the life of the proposal.
          if (writeModel.buildingBlockId !== undefined) {
            mintedId ??= writeModel.buildingBlockId
            expect(writeModel.buildingBlockId).toBe(mintedId)
          }

          // `Operation Applied` / `Operation Rejected` only ever land from ACCEPTED.
          if (writeModel.disposition === 'APPLIED' || writeModel.disposition === 'APPLY_FAILED') {
            expect(mintedId).toBeDefined()
          }
        }
      }),
    )
  })
})
