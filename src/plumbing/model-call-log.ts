import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { ModelName, TokenUsage } from './model-pricing.ts'

/**
 * One JSONL line per model call — request, response, Zod parse result, the AI
 * SDK `result.warnings`, token counts, and a cost estimate from the owned price
 * table (ADR-008). Append-only; each call writes exactly one
 * line to `<dataDir>/model-calls.jsonl`.
 */
export interface ModelCallEntry {
  at: string
  model: ModelName
  requestMessages: unknown
  responseText: string
  parseResult: 'ok' | { error: string }
  warnings: unknown
  usage: TokenUsage
  costEstimateUsd: number
}

const FILE = 'model-calls.jsonl'

export function logModelCall(dataDir: string, entry: ModelCallEntry): void {
  mkdirSync(dataDir, { recursive: true })
  appendFileSync(join(dataDir, FILE), `${JSON.stringify(entry)}\n`)
}
