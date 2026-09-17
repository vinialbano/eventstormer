import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isOk } from '~/plumbing/result.ts'
import interpretation from './interpretation.json'
import { parseSeedScript, seedScriptedFacilitator } from './facilitator.ts'

const transcriptPath = fileURLToPath(
  new URL('../../.specs/features/slice-5b-facilitator-eval-demo-seed/transcript.md', import.meta.url),
)

const transcriptTurnBodies = (): string[] =>
  readFileSync(transcriptPath, 'utf8')
    .split('\n')
    .map((line) => /^\d+\.\s+(.*)$/.exec(line)?.[1])
    .filter((body): body is string => body !== undefined)

const promptEndingWith = (body: string): { instructions: string; prompt: string } => ({
  instructions: '',
  prompt: `## New contribution to interpret\nSam: ${body}`,
})

describe('seed interpretation fixture', () => {
  it('parses — every value is a well-formed FacilitationTurn', () => {
    expect(() => parseSeedScript(interpretation)).not.toThrow()
  })

  it('covers every transcript turn body as a key', () => {
    const script = parseSeedScript(interpretation)
    const bodies = transcriptTurnBodies()
    expect(bodies.length).toBeGreaterThanOrEqual(15)
    for (const body of bodies) {
      expect(script, `missing interpretation for: ${body}`).toHaveProperty([body])
    }
  })
})

describe('seedScriptedFacilitator', () => {
  it('returns the mapped turn for a contribution the prompt ends with', async () => {
    const script = parseSeedScript(interpretation)
    const body = 'A guest placed their order with the server.'
    const result = await seedScriptedFacilitator(script).interpret(promptEndingWith(body))
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual(script[body])
    expect(result.value.interpretation[0]).toMatchObject({ track: 'propose-building-block', label: 'Order goes in' })
  })

  it('throws, naming the contribution, on an unscripted body', () => {
    const script = parseSeedScript(interpretation)
    expect(() => seedScriptedFacilitator(script).interpret(promptEndingWith('a line nobody narrated'))).toThrow(
      /no scripted interpretation/,
    )
  })

  it('answers askOpening without a model call', async () => {
    const opening = await seedScriptedFacilitator(parseSeedScript(interpretation)).askOpening({
      instructions: '',
      prompt: '',
    })
    expect(isOk(opening)).toBe(true)
  })
})
