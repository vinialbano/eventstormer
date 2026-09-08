import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { InterpretedTrack } from './interpreted-track.ts'

describe('InterpretedTrack — the stored discriminated union', () => {
  it('parses a plain-capture propose-building-block track — no hot-spot fields', () => {
    const track = {
      track: 'propose-building-block',
      proposalId: 'p_1',
      blockKind: 'domain-event',
      label: 'Loan recorded',
      bar: 'lenient',
      evidenceSpan: 'we record the loan',
    }
    const parsed = InterpretedTrack.parse(track)
    expect(parsed).toStrictEqual(track)
    expect(parsed).not.toHaveProperty('modelAffecting')
    expect(parsed).not.toHaveProperty('annotatesTargetId')
  })

  it('parses a hot-spot propose-building-block track carrying modelAffecting and annotatesTargetId', () => {
    const track = {
      track: 'propose-building-block',
      proposalId: 'p_1',
      blockKind: 'hot-spot',
      label: 'Refunds are disputed',
      bar: 'strict',
      modelAffecting: false,
      annotatesTargetId: 'b_7',
    }
    expect(InterpretedTrack.parse(track)).toStrictEqual(track)
  })

  it('rejects a block kind outside domain-event / actor / system / hot-spot', () => {
    expect(() =>
      InterpretedTrack.parse({
        track: 'propose-building-block',
        proposalId: 'p_1',
        blockKind: 'command',
        label: 'Record loan',
        bar: 'strict',
      }),
    ).toThrow()
  })

  it('bounds a proposed label at 200 chars', () => {
    expect(() =>
      InterpretedTrack.parse({
        track: 'propose-building-block',
        proposalId: 'p_1',
        blockKind: 'actor',
        label: 'x'.repeat(201),
        bar: 'strict',
      }),
    ).toThrow()
  })

  it('parses flag-phase / attribute-to-other-format / answer-question tracks', () => {
    expect(
      InterpretedTrack.parse({ track: 'flag-phase', questionId: 'q_1', questionText: 'Is X a phase?' })
        .track,
    ).toBe('flag-phase')
    expect(
      InterpretedTrack.parse({
        track: 'attribute-to-other-format',
        format: 'policy',
        note: 'This is a reaction rule.',
      }).track,
    ).toBe('attribute-to-other-format')
    expect(
      InterpretedTrack.parse({ track: 'answer-question', questionId: 'q_1' }).track,
    ).toBe('answer-question')
  })

  it('rejects an unknown track kind', () => {
    expect(() => InterpretedTrack.parse({ track: 'summarise' })).toThrow()
  })

  it('round-trips the three question-track judgment strands', () => {
    expect(
      InterpretedTrack.parse({
        track: 'reveal-knowledge-gap',
        questionId: 'q_1',
        detail: 'nobody owns returns',
      }),
    ).toEqual({ track: 'reveal-knowledge-gap', questionId: 'q_1', detail: 'nobody owns returns' })
    expect(InterpretedTrack.parse({ track: 'reveal-knowledge-gap', questionId: 'q_1' })).toEqual({
      track: 'reveal-knowledge-gap',
      questionId: 'q_1',
    })
    expect(
      InterpretedTrack.parse({
        track: 'name-absent-stakeholder',
        questionId: 'q_1',
        personName: 'ops lead',
      }),
    ).toEqual({ track: 'name-absent-stakeholder', questionId: 'q_1', personName: 'ops lead' })
    expect(() =>
      InterpretedTrack.parse({ track: 'name-absent-stakeholder', questionId: 'q_1', personName: '' }),
    ).toThrow()
    expect(
      InterpretedTrack.parse({ track: 'confirm-complete-perspective', questionId: 'q_1' }),
    ).toEqual({ track: 'confirm-complete-perspective', questionId: 'q_1' })
  })

  it('has no empty ({}) subschema — every field is concretely typed, no z.unknown()', () => {
    const json = JSON.stringify(z.toJSONSchema(InterpretedTrack))
    expect(json).not.toContain('{}')
  })
})

describe('InterpretedTrack — the model-change strands', () => {
  it('parses a propose-relation track whose named endpoint fields match its relationKind', () => {
    expect(
      InterpretedTrack.parse({
        track: 'propose-relation',
        proposalId: 'p_1',
        relationKind: 'sequence',
        predecessor: 'bb_a',
        successor: 'bb_b',
      }),
    ).toEqual({
      track: 'propose-relation',
      proposalId: 'p_1',
      relationKind: 'sequence',
      predecessor: 'bb_a',
      successor: 'bb_b',
    })
    expect(
      InterpretedTrack.parse({
        track: 'propose-relation',
        proposalId: 'p_2',
        relationKind: 'insert-between',
        predecessor: 'bb_a',
        inserted: 'bb_x',
        successor: 'bb_b',
      }).track,
    ).toBe('propose-relation')
    expect(
      InterpretedTrack.parse({
        track: 'propose-relation',
        proposalId: 'p_3',
        relationKind: 'place',
        target: 'bb_a',
      }).track,
    ).toBe('propose-relation')
    expect(
      InterpretedTrack.parse({
        track: 'propose-relation',
        proposalId: 'p_4',
        relationKind: 'link-cause',
        cause: 'bb_a',
        effect: 'bb_b',
      }).track,
    ).toBe('propose-relation')
  })

  it('rejects a propose-relation track with the wrong endpoint field set for its kind', () => {
    expect(() =>
      InterpretedTrack.parse({
        track: 'propose-relation',
        proposalId: 'p_1',
        relationKind: 'sequence',
        predecessor: 'bb_a',
        target: 'bb_b',
      }),
    ).toThrow()
    expect(() =>
      InterpretedTrack.parse({
        track: 'propose-relation',
        proposalId: 'p_1',
        relationKind: 'place',
        predecessor: 'bb_a',
        successor: 'bb_b',
      }),
    ).toThrow()
    expect(() =>
      InterpretedTrack.parse({
        track: 'propose-relation',
        proposalId: 'p_1',
        relationKind: 'sequence',
        predecessor: 'bb_a',
      }),
    ).toThrow()
  })

  it('parses a released propose-pivotal track and a held-back one', () => {
    expect(
      InterpretedTrack.parse({
        track: 'propose-pivotal',
        proposalId: 'p_1',
        pivotalKind: 'mark-pivotal',
        target: 'bb_a',
        heldBack: false,
        eventLabel: 'Loan recorded',
      }).track,
    ).toBe('propose-pivotal')
    expect(
      InterpretedTrack.parse({
        track: 'propose-pivotal',
        pivotalKind: 'mark-pivotal',
        heldBack: true,
        eventLabel: 'Loan recorded',
      }),
    ).toEqual({
      track: 'propose-pivotal',
      pivotalKind: 'mark-pivotal',
      heldBack: true,
      eventLabel: 'Loan recorded',
    })
  })

  it('rejects a propose-pivotal track whose heldBack flag disagrees with proposalId/target presence', () => {
    expect(() =>
      InterpretedTrack.parse({
        track: 'propose-pivotal',
        pivotalKind: 'mark-pivotal',
        heldBack: false,
        eventLabel: 'Loan recorded',
      }),
    ).toThrow()
    expect(() =>
      InterpretedTrack.parse({
        track: 'propose-pivotal',
        proposalId: 'p_1',
        target: 'bb_a',
        pivotalKind: 'mark-pivotal',
        heldBack: true,
        eventLabel: 'Loan recorded',
      }),
    ).toThrow()
  })

  it('parses a released propose-reword track and a held-back one, and rejects an inconsistent one', () => {
    expect(
      InterpretedTrack.parse({
        track: 'propose-reword',
        proposalId: 'p_1',
        target: 'bb_a',
        newLabel: 'Loan booked',
        heldBack: false,
        targetLabel: 'Loan recorded',
      }).track,
    ).toBe('propose-reword')
    expect(
      InterpretedTrack.parse({
        track: 'propose-reword',
        newLabel: 'Loan booked',
        heldBack: true,
        targetLabel: 'Loan recorded',
      }),
    ).toEqual({
      track: 'propose-reword',
      newLabel: 'Loan booked',
      heldBack: true,
      targetLabel: 'Loan recorded',
    })
    expect(() =>
      InterpretedTrack.parse({
        track: 'propose-reword',
        target: 'bb_a',
        newLabel: 'Loan booked',
        heldBack: true,
        targetLabel: 'Loan recorded',
      }),
    ).toThrow()
  })
})
