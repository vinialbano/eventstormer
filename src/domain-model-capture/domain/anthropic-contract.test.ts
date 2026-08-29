import { describe, expect, it } from 'vitest'
import { anthropicOperationSchema } from './anthropic-contract.ts'

interface JsonSchemaNode {
  properties?: Record<string, unknown>
  required?: string[]
  anyOf?: JsonSchemaNode[]
}

describe('anthropicOperationSchema (compatibility sensor)', () => {
  const schema = anthropicOperationSchema()
  const json = JSON.stringify(schema)

  it('contains no "oneOf" key at any depth (S0-22)', () => {
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

  it('matches the derived shape snapshot', () => {
    expect(schema).toMatchSnapshot()
  })
})
