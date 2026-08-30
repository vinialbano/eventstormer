import { describe, expect, it } from 'vitest'
import { WorkshopId as PlumbingWorkshopId } from '~/plumbing/ids.ts'
import type {
  ContributionId as ContributionIdMirror,
  ProposalId as ProposalIdMirror,
  QuestionId as QuestionIdMirror,
  SessionId as SessionIdMirror,
} from '~/plumbing/ids.ts'
import { ContributionId, ProposalId, QuestionId, SessionId, WorkshopId } from './ids.ts'

describe('session-facilitation branded id schemas', () => {
  it('parses a string into each brand, leaving the value unchanged', () => {
    expect(SessionId.parse('s_1')).toBe('s_1')
    expect(ContributionId.parse('c_1')).toBe('c_1')
    expect(ProposalId.parse('p_1')).toBe('p_1')
    expect(QuestionId.parse('q_1')).toBe('q_1')
  })

  it('rejects a non-string', () => {
    expect(() => SessionId.parse(1)).toThrow()
  })

  it('re-exports the one canonical WorkshopId from plumbing', () => {
    expect(WorkshopId).toBe(PlumbingWorkshopId)
  })

  it('each schema infers the plumbing type mirror — assignable with no cast', () => {
    const s: SessionIdMirror = SessionId.parse('s_1')
    const c: ContributionIdMirror = ContributionId.parse('c_1')
    const p: ProposalIdMirror = ProposalId.parse('p_1')
    const q: QuestionIdMirror = QuestionId.parse('q_1')
    expect([s, c, p, q]).toEqual(['s_1', 'c_1', 'p_1', 'q_1'])
  })
})
