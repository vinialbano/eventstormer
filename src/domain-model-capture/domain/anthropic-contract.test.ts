import { describe, expect, it } from 'vitest'
import { anthropicOperationSchema } from './anthropic-contract.ts'

interface JsonSchemaNode {
  properties?: Record<string, unknown>
  required?: string[]
  anyOf?: JsonSchemaNode[]
}

// Full-shape drift is caught by the snapshot below. Targeted invariants are
// pinned as literals so a regression names the failure without opening the
// snapshot diff. Broader compatibility is also verified via the mutation-sensor
// workflow in docs/testing.md (separate worktree — never the shared checkout).
describe('anthropicOperationSchema (compatibility sensor)', () => {
  const schema = anthropicOperationSchema()
  const json = JSON.stringify(schema)

  it('contains no "oneOf" key at any depth', () => {
    expect(json).not.toContain('"oneOf"')
  })

  it('rewrites the operation discriminated union to a 20-member anyOf', () => {
    const anyOf = (schema as JsonSchemaNode).anyOf
    expect(Array.isArray(anyOf)).toBe(true)
    expect(anyOf).toHaveLength(20)
  })

  it('treats v as an optional input — io:"input" picks up .default(1)', () => {
    for (const variant of (schema as JsonSchemaNode).anyOf ?? []) {
      expect(variant.properties).toHaveProperty('v')
      expect(variant.required ?? []).not.toContain('v')
    }
  })

  it('is a pure function of the Zod SSOT — a repeat call yields an equal shape', () => {
    expect(anthropicOperationSchema()).toEqual(schema)
  })

  it('pins structural invariants alongside the derived shape snapshot', () => {
    expect(schema).toEqual(
      expect.objectContaining({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
      }),
    )
    const anyOf = (schema as JsonSchemaNode).anyOf ?? []
    const kindConst = (variant: JsonSchemaNode): string | undefined => {
      const kind = variant.properties?.kind
      return typeof kind === 'object' && kind !== null && 'const' in kind
        ? String(kind.const)
        : undefined
    }
    expect(anyOf.map(kindConst).toSorted()).toEqual(
      [
        'annotate',
        'capture-domain-event',
        'identify-actor',
        'identify-system',
        'insert-between',
        'link-cause',
        'mark-pivotal',
        'place',
        'raise-hot-spot',
        'reinstate',
        'reopen',
        'resolve',
        'reword',
        'sequence',
        'unannotate',
        'unlink-cause',
        'unmark-pivotal',
        'unplace',
        'unsequence',
        'withdraw',
      ].toSorted(),
    )
    expect(schema).toMatchSnapshot()
  })
})
