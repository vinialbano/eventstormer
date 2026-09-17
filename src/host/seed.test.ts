import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Facilitator } from '../session-facilitation/api.ts'
import interpretation from '../../scripts/seed/interpretation.json'
import { parseSeedScript, seedScriptedFacilitator } from '../../scripts/seed/facilitator.ts'
import { loadConfig } from './config.ts'
import { runSeed, type SeedDeps } from './seed.ts'

let directory: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'eventstormer-seed-'))
})
afterEach(() => {
  rmSync(directory, { recursive: true, force: true })
  vi.unstubAllGlobals()
})

const scopeStatement =
  "We're mapping how a dinner order gets from the table to the guest — the kitchen side of it."

const turns = Object.keys(interpretation).map((body) => ({ speaker: 'Sam', body }))

const wire = (): { deps: SeedDeps; interpretCalls: () => number } => {
  const config = loadConfig({
    FACILITATOR_MODE: 'scripted',
    EVENTSTORMER_DB: join(directory, 'e.db'),
    DATA_DIR: directory,
  })
  const scripted = seedScriptedFacilitator(parseSeedScript(interpretation))
  let calls = 0
  const facilitator: Facilitator = {
    interpret: (input) => {
      calls += 1
      return scripted.interpret(input)
    },
    askOpening: (input) => scripted.askOpening(input),
  }
  return {
    deps: {
      config,
      facilitator,
      turns,
      scopeStatement,
      creatorName: 'Sam',
      markerPath: join(directory, 'seed.json'),
    },
    interpretCalls: () => calls,
  }
}

const board = async (deps: SeedDeps, workshopId: string) => {
  const app = (await import('./routes.ts')).createRoutes(deps.config)
  const response = await app.request(`/api/workshops/${workshopId}/board`)
  return (await response.json()) as {
    blocks: { id: string; kind: string; withdrawn?: boolean }[]
    follows: { predecessor: string; successor: string }[]
    hotSpotCount: number
  }
}

describe('runSeed', () => {
  it('replays the narration through the real handlers into a populated board', async () => {
    // No ANTHROPIC_API_KEY in the passed env, and any outbound HTTP is a failure.
    vi.stubGlobal('fetch', () => {
      throw new Error('seed made an outbound HTTP call')
    })
    const { deps, interpretCalls } = wire()

    const outcome = await runSeed(deps, { force: false })
    expect(outcome.status).toBe('seeded')
    if (outcome.status !== 'seeded') return

    // Every interpretation came from the scripted fixture, one per turn.
    expect(interpretCalls()).toBe(turns.length)

    const snapshot = await board(deps, outcome.workshopId)
    const live = snapshot.blocks.filter((block) => block.withdrawn !== true)
    const domainEvents = live.filter((block) => block.kind === 'domain-event')
    const hotSpots = live.filter((block) => block.kind === 'hot-spot')

    expect(domainEvents).toHaveLength(11)
    expect(hotSpots).toHaveLength(1)
    expect(snapshot.hotSpotCount).toBe(1)
    expect(snapshot.follows).toHaveLength(2)

    expect(existsSync(deps.markerPath)).toBe(true)
    expect(outcome.url).toBe(`/workshops/${outcome.workshopId}`)
  })

  it('refuses a re-run without force, and force wipes the prior seed and re-seeds', async () => {
    const first = wire()
    const one = await runSeed(first.deps, { force: false })
    expect(one.status).toBe('seeded')
    if (one.status !== 'seeded') return

    const refused = await runSeed(wire().deps, { force: false })
    expect(refused).toEqual({ status: 'refused', workshopId: one.workshopId })

    const forced = await runSeed(wire().deps, { force: true })
    expect(forced.status).toBe('seeded')
    if (forced.status !== 'seeded') return
    expect(forced.workshopId).not.toBe(one.workshopId)

    // the prior workshop's streams are gone
    const app = (await import('./routes.ts')).createRoutes(first.deps.config)
    const staleResponse = await app.request(`/api/workshops/${one.workshopId}/board`)
    expect(staleResponse.status).toBe(404)
    // the re-seed is whole
    const fresh = await board(first.deps, forced.workshopId)
    expect(fresh.follows).toHaveLength(2)
    expect(fresh.hotSpotCount).toBe(1)
  })

  it('force-seeds normally when no prior seed exists', async () => {
    const { deps } = wire()
    const outcome = await runSeed(deps, { force: true })
    expect(outcome.status).toBe('seeded')
  })
})
