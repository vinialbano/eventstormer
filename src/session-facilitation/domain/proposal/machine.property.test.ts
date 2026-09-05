import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { BuildingBlockId, ContributionId, ProposalId, SessionId } from '~/plumbing/ids.ts'
import { isOk } from '~/plumbing/result.ts'
import { decide } from './decide.ts'
import { evolve } from './evolve.ts'
import { type Disposition, emptyProposal, type ProposalCommand, TERMINAL } from './model.ts'
import { replay } from './replay.ts'

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
      proposalId,
      sessionId: 's_1' as SessionId,
      contributionId: 'c_1' as ContributionId,
      blockKind: 'domain-event',
      label: 'x',
      bar: 'strict',
      at,
    }),
    fc.constant<ProposalCommand>({ type: 'Edit Proposal', proposalId, label: 'y', at }),
    fc.constant<ProposalCommand>({
      type: 'Propose Model Change',
      proposalId,
      sessionId: 's_1' as SessionId,
      contributionId: 'c_1' as ContributionId,
      intent: { kind: 'reword', target: 'b_t' as BuildingBlockId, newLabel: 'z' },
      at,
    }),
    fc.constant<ProposalCommand>({
      type: 'Edit Model Change',
      proposalId,
      changed: { newLabel: 'z2' },
      at,
    }),
    fc.constant<ProposalCommand>({
      type: 'Accept Proposal',
      proposalId,
      accepter: 'Dana',
      buildingBlockId: bbId as BuildingBlockId,
      at,
    }),
    fc.constant<ProposalCommand>({ type: 'Reject Proposal', proposalId, at }),
    fc.constant<ProposalCommand>({ type: 'Hold Proposal', proposalId, at }),
    fc.constant<ProposalCommand>({ type: 'Unhold Proposal', proposalId, at }),
    fc.constant<ProposalCommand>({
      type: 'Record Operation Applied',
      proposalId,
      resultingBuildingBlockId: 'b_applied' as BuildingBlockId,
      at,
    }),
    fc.constant<ProposalCommand>({
      type: 'Record Operation Rejected',
      proposalId,
      reason: 'r',
      at,
    }),
    fc.constant<ProposalCommand>({ type: 'Lapse Proposal', proposalId, cause: 'undisposed', at }),
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
          // A block-born proposal mints a `buildingBlockId` at accept; a
          // model-change proposal never does.
          if (
            writeModel.birthKind === 'block' &&
            (writeModel.disposition === 'APPLIED' || writeModel.disposition === 'APPLY_FAILED')
          ) {
            expect(mintedId).toBeDefined()
          }
        }
      }),
    )
  })

  it('replay(log ++ [e]) deep-equals evolve(replay(log), e) — model-change commands included', () => {
    fc.assert(
      fc.property(fc.array(command('b_1'), { maxLength: 40 }), (cmds) => {
        const log: Parameters<typeof replay>[0] = []
        for (const nextCommand of cmds) {
          const result = decide(replay(log), nextCommand)
          if (!isOk(result)) continue
          for (const event of result.value) {
            expect(replay([...log, event])).toEqual(evolve(replay(log), event))
            log.push(event)
          }
        }
      }),
    )
  })

  it('a Model Change Proposed stream drives the same disposition transitions; neither birth is not-born', () => {
    expect(replay([]).born).toBe(false)
    const born = replay([
      {
        v: 1,
        at,
        type: 'Model Change Proposed',
        proposalId,
        sessionId: 's_1' as SessionId,
        contributionId: 'c_1' as ContributionId,
        intent: { kind: 'pivotal', pivotalKind: 'mark-pivotal', target: 'b_t' as BuildingBlockId },
      },
    ])
    expect(born.born).toBe(true)
    expect(born.birthKind).toBe('model-change')

    const accepted = decide(born, { type: 'Accept Proposal', proposalId, accepter: 'Dana', at })
    expect(isOk(accepted)).toBe(true)
    if (!isOk(accepted)) return
    const model = accepted.value.reduce(evolve, born)
    expect(model.disposition).toBe('ACCEPTED')

    const applied = decide(model, {
      type: 'Record Operation Applied',
      proposalId,
      resultingBuildingBlockId: 'b_r' as BuildingBlockId,
      at,
    })
    expect(isOk(applied) && applied.value[0]).toMatchObject({ type: 'Operation Applied' })
  })
})
