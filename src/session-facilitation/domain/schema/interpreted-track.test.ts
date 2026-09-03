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

  it('has no empty ({}) subschema — every field is concretely typed, no z.unknown()', () => {
    const json = JSON.stringify(z.toJSONSchema(InterpretedTrack))
    expect(json).not.toContain('{}')
  })
})
