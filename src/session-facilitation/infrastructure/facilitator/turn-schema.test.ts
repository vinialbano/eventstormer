import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { FacilitationTrack, FacilitationTurnSchema } from './turn-schema.ts'

/**
 * The facilitator schema must clear two hard Anthropic limits —
 * ≤ 24 optional parameters, and no empty (`{}`) subschema — and enforce the hard
 * proposals-per-turn ceiling of 12.
 */

interface JsonSchema {
  type?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema | JsonSchema[]
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  allOf?: JsonSchema[]
  $defs?: Record<string, JsonSchema>
  definitions?: Record<string, JsonSchema>
  additionalProperties?: JsonSchema | boolean
}

const walk = (node: JsonSchema | boolean | undefined, visit: (n: JsonSchema) => void): void => {
  if (node === undefined || typeof node === 'boolean') return
  visit(node)
  for (const child of [
    ...Object.values(node.properties ?? {}),
    ...(Array.isArray(node.items) ? node.items : node.items ? [node.items] : []),
    ...(node.anyOf ?? []),
    ...(node.oneOf ?? []),
    ...(node.allOf ?? []),
    ...Object.values(node.$defs ?? {}),
    ...Object.values(node.definitions ?? {}),
  ]) {
    walk(child, visit)
  }
  walk(typeof node.additionalProperties === 'object' ? node.additionalProperties : undefined, visit)
}

const jsonSchema = z.toJSONSchema(FacilitationTurnSchema, { io: 'input' }) as JsonSchema

describe('FacilitationTurnSchema — Anthropic structured-output limits', () => {
  it('has 24 or fewer optional parameters across the whole schema', () => {
    let optionalCount = 0
    walk(jsonSchema, (node) => {
      if (node.properties === undefined) return
      const required = new Set(node.required ?? [])
      for (const key of Object.keys(node.properties)) if (!required.has(key)) optionalCount += 1
    })
    // evidenceSpan, modelAffecting, annotatesTargetId (propose-building-block) + questionText (nextMove).
    expect(optionalCount).toBe(4)
    expect(optionalCount).toBeLessThanOrEqual(24)
  })

  it('contains no empty {} subschema (every field is a concrete type — no z.unknown())', () => {
    const empties: string[] = []
    walk(jsonSchema, (node) => {
      const keys = Object.keys(node).filter((key) => key !== 'description' && key !== 'title')
      if (keys.length === 0) empties.push(JSON.stringify(node))
    })
    expect(empties).toEqual([])
  })
})

describe('FacilitationTurnSchema — the hard ceilings', () => {
  const proposeTrack = {
    track: 'propose-building-block' as const,
    blockKind: 'domain-event' as const,
    label: 'Loan recorded',
    bar: 'strict' as const,
  }

  it('accepts a turn with exactly 12 proposal tracks', () => {
    const parsed = FacilitationTurnSchema.parse({
      interpretation: Array.from({ length: 12 }, () => proposeTrack),
      nextMove: { move: 'acknowledge' },
    })
    expect(parsed.interpretation).toHaveLength(12)
  })

  it('rejects a turn with 13 tracks', () => {
    expect(() =>
      FacilitationTurnSchema.parse({
        interpretation: Array.from({ length: 13 }, () => proposeTrack),
        nextMove: { move: 'acknowledge' },
      }),
    ).toThrow()
  })

  it('accepts a propose-resolution strand with a hot-spot id and a reference', () => {
    const parsed = FacilitationTrack.parse({
      track: 'propose-resolution',
      hotSpotId: 'h_1',
      reference: 'added a retry with backoff',
    })
    expect(parsed).toEqual({
      track: 'propose-resolution',
      hotSpotId: 'h_1',
      reference: 'added a retry with backoff',
    })
  })

  it('accepts a hot-spot propose-building-block strand with modelAffecting and annotatesTargetId', () => {
    const parsed = FacilitationTrack.parse({
      track: 'propose-building-block',
      blockKind: 'hot-spot',
      label: 'Refund policy is disputed',
      bar: 'strict',
      modelAffecting: false,
      annotatesTargetId: 'Refund issued',
    })
    expect(parsed).toEqual({
      track: 'propose-building-block',
      blockKind: 'hot-spot',
      label: 'Refund policy is disputed',
      bar: 'strict',
      modelAffecting: false,
      annotatesTargetId: 'Refund issued',
    })
  })

  it('rejects a proposal label longer than 200 characters', () => {
    expect(() =>
      FacilitationTrack.parse({ ...proposeTrack, label: 'x'.repeat(201) }),
    ).toThrow()
  })
})
