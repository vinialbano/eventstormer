import { z } from 'zod'
import { ok } from '~/plumbing/result.ts'
import type { Facilitator } from '~/session-facilitation/api.ts'
import {
  type FacilitationTurn,
  FacilitationTurnSchema,
} from '~/session-facilitation/infrastructure/facilitator/turn-schema.ts'

/**
 * The committed, offline interpretation of the seed narration: one
 * `FacilitationTurn` per `transcript.md` turn body, keyed by that body verbatim.
 * `pnpm seed` replays these through the real capability handlers — no model call,
 * no API key, deterministic (AD-039).
 */
export type SeedScript = Record<string, FacilitationTurn>

const SeedScriptSchema = z.record(z.string(), FacilitationTurnSchema)

/** Parse `interpretation.json` into a validated script, throwing on a bad turn. */
export const parseSeedScript = (raw: unknown): SeedScript => SeedScriptSchema.parse(raw)

/**
 * A `Facilitator` that returns the scripted turn for the contribution the prompt
 * ends with. The per-turn prompt (`buildTurnInput`) always closes with
 * `<speaker>: <contribution body>`, so an exact suffix match on a script key
 * finds the turn without parsing the speaker out. An unscripted contribution
 * throws — the fixture must cover every seeded turn (SEED-05).
 */
export const seedScriptedFacilitator = (script: SeedScript): Facilitator => ({
  interpret: (input) => {
    const prompt = input.prompt.trimEnd()
    const entry = Object.entries(script).find(([body]) => prompt.endsWith(body))
    if (entry === undefined) {
      throw new Error(
        `seed facilitator: no scripted interpretation for a contribution ending "${prompt.slice(-120)}"`,
      )
    }
    return Promise.resolve(ok(entry[1]))
  },
  askOpening: () =>
    Promise.resolve(
      ok({
        questionText: 'What business are you mapping?',
        scopeStatement: 'A restaurant kitchen fulfilling dine-in orders.',
      }),
    ),
})
