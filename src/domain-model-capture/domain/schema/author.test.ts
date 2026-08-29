import { describe, expect, it } from 'vitest'
import { Author } from './author.ts'

const human = { name: 'Dana' }

describe('Author', () => {
  it('accepts an accepter alone — a human direct edit (S0-07)', () => {
    expect(Author.parse({ accepter: human })).toEqual({ accepter: human })
  })

  it('accepts both a proposer and an accepter — a facilitator-originated op (S0-07)', () => {
    const both = { proposer: { name: 'facilitator' }, accepter: human }
    expect(Author.parse(both)).toEqual(both)
  })

  it('rejects a proposer with no accepter', () => {
    expect(() => Author.parse({ proposer: human })).toThrow()
  })

  it('rejects a blank party name', () => {
    expect(() => Author.parse({ accepter: { name: '' } })).toThrow()
  })
})
