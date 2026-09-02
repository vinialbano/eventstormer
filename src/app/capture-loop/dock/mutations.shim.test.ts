import { describe, expect, it } from 'vitest'
import {
  acceptProposal,
  editProposal,
  holdProposal,
  postBoardOperation,
  rejectProposal,
  setScope,
  submitContribution,
  unholdProposal,
  type BoardEdit,
} from './mutations.ts'

describe('dock/mutations shim', () => {
  it('re-exports proposal, session, and board transport', () => {
    expect(typeof acceptProposal).toBe('function')
    expect(typeof editProposal).toBe('function')
    expect(typeof rejectProposal).toBe('function')
    expect(typeof holdProposal).toBe('function')
    expect(typeof unholdProposal).toBe('function')
    expect(typeof submitContribution).toBe('function')
    expect(typeof setScope).toBe('function')
    expect(typeof postBoardOperation).toBe('function')
    const operation: BoardEdit = {
      v: 1,
      kind: 'place',
      target: 'b1',
      author: { accepter: { name: 'Maria' } },
    }
    expect(operation.kind).toBe('place')
  })
})
