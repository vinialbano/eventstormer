import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { type Clock, systemClock } from '~/plumbing/clock.ts'
import { createSqliteEventStore } from '~/plumbing/event-store/sqlite-adapter.ts'
import type { EventStore } from '~/plumbing/event-store/port.ts'
import { newProposalId, newQuestionId } from '~/plumbing/ids.ts'
import { isModelName, MODEL_NAMES } from '~/plumbing/model-pricing.ts'
import { ok } from '~/plumbing/result.ts'
import {
  applySessionFacilitationMigrations,
  createAnthropicFacilitator,
  createInFlightGuard,
  type Facilitator,
  type FacilitationTurn,
  type InFlightGuard,
  type OpeningQuestion,
  type TrackIdMint,
} from '../session-facilitation/api.ts'

/**
 * The composition root's configuration. `pnpm dev` calls `loadConfig()`; it
 * **fails fast** with a one-line fix message when `ANTHROPIC_API_KEY` is unset,
 * unless `FACILITATOR_MODE=scripted` wires a canned `Facilitator`
 * double instead (the same seam `pnpm seed` and the E2E spec reuse — real
 * server, real DB, fake model).
 */
export interface HostConfig {
  store: EventStore
  db: DatabaseSync
  clock: Clock
  facilitator: Facilitator
  inFlight: InFlightGuard
  mint: TrackIdMint
  interpretationIntervalMs: number
}

const DEFAULT_DB_PATH = './data/eventstormer.db'
const DEFAULT_INTERVAL_MS = 750

/**
 * A scripted `Facilitator` — cycles the turns / openings in
 * `SCRIPTED_FACILITATOR_FILE` (a JSON `{ turns: FacilitationTurn[], openings:
 * OpeningQuestion[] }`), falling back to a bare acknowledge / a generic scope
 * question. No network, no key.
 */
const scriptedFacilitator = (file: string | undefined): Facilitator => {
  const parsed =
    file === undefined
      ? { turns: [] as FacilitationTurn[], openings: [] as OpeningQuestion[] }
      : (JSON.parse(readFileSync(file, 'utf8')) as { turns?: FacilitationTurn[]; openings?: OpeningQuestion[] })
  const turns = parsed.turns ?? []
  const openings = parsed.openings ?? []
  let t = 0
  let o = 0

  const acknowledge: FacilitationTurn = { interpretation: [], nextMove: { move: 'acknowledge' } }
  const scopeQuestion: OpeningQuestion = {
    questionText: 'What business are you mapping?',
    scopeStatement: 'A business being mapped in a Big Picture workshop.',
  }

  return {
    interpret: () => Promise.resolve(ok(turns[Math.min(t++, turns.length - 1)] ?? acknowledge)),
    askOpening: () => Promise.resolve(ok(openings[Math.min(o++, openings.length - 1)] ?? scopeQuestion)),
  }
}

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): HostConfig => {
  const scripted = env.FACILITATOR_MODE === 'scripted'
  if (!scripted && (env.ANTHROPIC_API_KEY ?? '') === '') {
    throw new Error(
      'ANTHROPIC_API_KEY is not set — add it to .env (or set FACILITATOR_MODE=scripted for a canned facilitator) before running `pnpm dev`.',
    )
  }

  const dbPath = env.EVENTSTORMER_DB ?? DEFAULT_DB_PATH
  const dataDir = env.DATA_DIR ?? './data'
  const clock = systemClock

  // `node:sqlite` and the JSONL model-call log both fail if their parent
  // directory is absent — create it so `pnpm dev` boots without a pre-existing
  // `data/` (recursive + idempotent, so an existing directory is a no-op).
  mkdirSync(dataDir, { recursive: true })
  mkdirSync(dirname(dbPath), { recursive: true })

  const store = createSqliteEventStore(dbPath)
  // Same 5s busy-wait window as the EventStore connection — the projection
  // handlers (`reserve` / `close` / `markDerivedTrack`) share the file.
  const db = new DatabaseSync(dbPath, { timeout: 5_000 })
  applySessionFacilitationMigrations(db)

  const requested = env.FACILITATOR_MODEL
  const model = requested !== undefined && requested !== '' && isModelName(requested) ? requested : undefined
  if (requested !== undefined && requested !== '' && model === undefined) {
    console.warn(
      `FACILITATOR_MODEL="${requested}" is not supported — using claude-sonnet-5. Supported: ${MODEL_NAMES.join(', ')}.`,
    )
  }

  const facilitator = scripted
    ? scriptedFacilitator(env.SCRIPTED_FACILITATOR_FILE)
    : createAnthropicFacilitator({ dataDir, clock, ...(model === undefined ? {} : { model }) })

  return {
    store,
    db,
    clock,
    facilitator,
    inFlight: createInFlightGuard(),
    mint: { proposalId: newProposalId, questionId: newQuestionId },
    interpretationIntervalMs: Number(env.INTERPRETATION_INTERVAL_MS ?? DEFAULT_INTERVAL_MS),
  }
}
