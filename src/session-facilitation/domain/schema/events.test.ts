import { describe, expect, it } from 'vitest'
import { ProposalEvent, SessionEvent, WorkshopEvent } from './events.ts'

const at = '2026-08-30T12:00:00.000Z'

const workshopStarted = {
  v: 1,
  at,
  type: 'Workshop Started',
  workshopId: 'w_1',
  format: 'big-picture',
  creatorName: 'Dana',
}
const scopeQuestion = {
  v: 1,
  at,
  type: 'Question Asked',
  sessionId: 's_1',
  questionId: 'q_1',
  kind: 'scope',
  text: 'What business are you mapping?',
  scopeStatement: 'Library lending across branches.',
}
const phaseQuestion = {
  v: 1,
  at,
  type: 'Question Asked',
  sessionId: 's_1',
  questionId: 'q_2',
  kind: 'phase',
  text: 'Is "fulfilment" a phase?',
}
const buildingBlockProposed = {
  v: 1,
  at,
  type: 'Building Block Proposed',
  proposalId: 'p_1',
  sessionId: 's_1',
  contributionId: 'c_1',
  blockKind: 'domain-event',
  label: 'Loan recorded',
  bar: 'strict',
}

describe('WorkshopEvent SSOT', () => {
  it('parses a well-formed Workshop Started', () => {
    expect(WorkshopEvent.parse(workshopStarted).type).toBe('Workshop Started')
  })

  it('every variant requires v === 1', () => {
    expect(() => WorkshopEvent.parse({ ...workshopStarted, v: 2 })).toThrow()
    const { v, ...noV } = workshopStarted
    expect(v).toBe(1)
    expect(() => WorkshopEvent.parse(noV)).toThrow()
  })

  it('rejects an unknown event type', () => {
    expect(() => WorkshopEvent.parse({ ...workshopStarted, type: 'Workshop Renamed' })).toThrow()
  })

  it('rejects a blank creatorName and one over 80 chars', () => {
    expect(() => WorkshopEvent.parse({ ...workshopStarted, creatorName: '' })).toThrow()
    expect(() => WorkshopEvent.parse({ ...workshopStarted, creatorName: 'x'.repeat(81) })).toThrow()
  })

  it('Scope Set caps the statement at 10 000 chars', () => {
    const scopeSet = { v: 1, at, type: 'Scope Set', workshopId: 'w_1', statement: 'x' }
    expect(WorkshopEvent.parse(scopeSet).type).toBe('Scope Set')
    expect(() =>
      WorkshopEvent.parse({ ...scopeSet, statement: 'x'.repeat(10_001) }),
    ).toThrow()
  })
})

describe('SessionEvent SSOT — Question Asked refine (scopeStatement iff kind === scope)', () => {
  it('accepts a scope question that carries a scopeStatement', () => {
    expect(SessionEvent.parse(scopeQuestion).type).toBe('Question Asked')
  })

  it('rejects a scope question with no scopeStatement', () => {
    const { scopeStatement, ...noStatement } = scopeQuestion
    expect(scopeStatement).toBeTypeOf('string')
    expect(() => SessionEvent.parse(noStatement)).toThrow()
  })

  it('accepts a phase question with no scopeStatement', () => {
    expect(SessionEvent.parse(phaseQuestion).type).toBe('Question Asked')
  })

  it('rejects a phase question that carries a scopeStatement', () => {
    expect(() =>
      SessionEvent.parse({ ...phaseQuestion, scopeStatement: 'nope' }),
    ).toThrow()
  })

  it('every variant requires v === 1', () => {
    expect(() => SessionEvent.parse({ ...phaseQuestion, v: 2 })).toThrow()
    const { v, ...noV } = phaseQuestion
    expect(v).toBe(1)
    expect(() => SessionEvent.parse(noV)).toThrow()
  })

  it('rejects a free question that carries a scopeStatement', () => {
    expect(() =>
      SessionEvent.parse({ ...phaseQuestion, kind: 'free', scopeStatement: 'nope' }),
    ).toThrow()
  })
})

describe('SessionEvent SSOT — other variants', () => {
  it('Contribution Made requires source "typed" and bounds the body at 10 000', () => {
    const made = {
      v: 1,
      at,
      type: 'Contribution Made',
      sessionId: 's_1',
      contributionId: 'c_1',
      speaker: 'Dana',
      body: 'A member borrowed a book.',
      source: 'typed',
    }
    expect(SessionEvent.parse(made).type).toBe('Contribution Made')
    expect(() => SessionEvent.parse({ ...made, source: 'voice' })).toThrow()
    expect(() => SessionEvent.parse({ ...made, body: 'x'.repeat(10_001) })).toThrow()
  })

  it('Contribution Interpretation Failed is its own event with a reason', () => {
    const failed = {
      v: 1,
      at,
      type: 'Contribution Interpretation Failed',
      sessionId: 's_1',
      contributionId: 'c_1',
      reason: 'schema-invalid after one retry',
    }
    expect(SessionEvent.parse(failed)).toMatchObject({
      type: 'Contribution Interpretation Failed',
      reason: 'schema-invalid after one retry',
    })
  })

  it('Session Closed carries only unresolvedQuestionIds + the base fields (no summary struct)', () => {
    const closed = {
      v: 1,
      at,
      type: 'Session Closed',
      sessionId: 's_1',
      workshopId: 'w_1',
      unresolvedQuestionIds: ['q_2'],
      blocksAdded: 3,
    }
    const parsed = SessionEvent.parse(closed)
    expect(parsed).toStrictEqual({
      v: 1,
      at,
      type: 'Session Closed',
      sessionId: 's_1',
      workshopId: 'w_1',
      unresolvedQuestionIds: ['q_2'],
    })
  })

  it('Contribution Interpreted carries the stored tracks and optional askQuestion fields', () => {
    const interpreted = {
      v: 1,
      at,
      type: 'Contribution Interpreted',
      sessionId: 's_1',
      contributionId: 'c_1',
      tracks: [
        { track: 'propose-building-block', proposalId: 'p_1', blockKind: 'actor', label: 'Member', bar: 'strict' },
      ],
      askQuestionId: 'q_1',
      askQuestionText: 'What happens right after a member joins?',
    }
    expect(SessionEvent.parse(interpreted)).toMatchObject({
      type: 'Contribution Interpreted',
      tracks: [{ track: 'propose-building-block', proposalId: 'p_1' }],
      askQuestionId: 'q_1',
      askQuestionText: 'What happens right after a member joins?',
    })
  })

  it('Contribution Interpreted omits askQuestion fields when not present', () => {
    const interpreted = {
      v: 1,
      at,
      type: 'Contribution Interpreted',
      sessionId: 's_1',
      contributionId: 'c_1',
      tracks: [
        { track: 'propose-building-block', proposalId: 'p_1', blockKind: 'actor', label: 'Member', bar: 'strict' },
      ],
    }
    const parsed = SessionEvent.parse(interpreted)
    expect(parsed).toMatchObject({
      type: 'Contribution Interpreted',
      tracks: [{ track: 'propose-building-block', proposalId: 'p_1' }],
    })
    expect(parsed).not.toHaveProperty('askQuestionId')
    expect(parsed).not.toHaveProperty('askQuestionText')
  })
})

describe('ProposalEvent SSOT', () => {
  it('parses a well-formed Building Block Proposed', () => {
    expect(ProposalEvent.parse(buildingBlockProposed).type).toBe('Building Block Proposed')
  })

  it('parses a Building Block Proposed with neither hot-spot field as a plain capture', () => {
    const parsed = ProposalEvent.parse(buildingBlockProposed)
    expect(parsed.type).toBe('Building Block Proposed')
    expect(parsed).not.toHaveProperty('modelAffecting')
    expect(parsed).not.toHaveProperty('annotatesTargetId')
  })

  it('parses a hot-spot Building Block Proposed carrying modelAffecting and annotatesTargetId', () => {
    const parsed = ProposalEvent.parse({
      ...buildingBlockProposed,
      blockKind: 'hot-spot',
      modelAffecting: false,
      annotatesTargetId: 'b_2',
    })
    expect(parsed).toMatchObject({
      blockKind: 'hot-spot',
      modelAffecting: false,
      annotatesTargetId: 'b_2',
    })
  })

  it('every variant requires v === 1', () => {
    expect(() => ProposalEvent.parse({ ...buildingBlockProposed, v: 2 })).toThrow()
  })

  it('Proposal Edited bounds the label at 200 chars', () => {
    const edited = { v: 1, at, type: 'Proposal Edited', proposalId: 'p_1', label: 'x' }
    expect(ProposalEvent.parse(edited).type).toBe('Proposal Edited')
    expect(() => ProposalEvent.parse({ ...edited, label: 'x'.repeat(201) })).toThrow()
  })

  it('Proposal Accepted carries a minted buildingBlockId and the accepter', () => {
    const accepted = {
      v: 1,
      at,
      type: 'Proposal Accepted',
      proposalId: 'p_1',
      accepter: 'Dana',
      buildingBlockId: 'b_1',
    }
    const parsed = ProposalEvent.parse(accepted)
    expect(parsed).toMatchObject({ buildingBlockId: 'b_1', accepter: 'Dana' })
  })

  it('Proposal Lapsed constrains cause to the two known values', () => {
    const lapsed = { v: 1, at, type: 'Proposal Lapsed', proposalId: 'p_1', cause: 'undisposed' }
    expect(ProposalEvent.parse(lapsed)).toMatchObject({ type: 'Proposal Lapsed', cause: 'undisposed' })
    expect(() => ProposalEvent.parse({ ...lapsed, cause: 'because' })).toThrow()
  })

  it('has no overflow field on Building Block Proposed', () => {
    const parsed = ProposalEvent.parse({ ...buildingBlockProposed, overflow: true })
    expect(parsed).not.toHaveProperty('overflow')
  })
})
