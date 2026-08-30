/**
 * An owned price table — the AI SDK reports token counts but never cost
 * (docs/adr/008: "cost is `tokens × an owned price table`"). List prices in USD per
 * million tokens; `cacheRead` is Anthropic's standard 0.1× the input rate.
 * Update by hand when Anthropic's pricing changes.
 */
export type ModelName = 'claude-sonnet-5' | 'claude-haiku-4-5'

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
}

interface Rate {
  input: number
  output: number
  cacheRead: number
}

const PRICE_PER_MTOK: Record<ModelName, Rate> = {
  'claude-sonnet-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1 },
}

/**
 * Estimated USD cost of one model call from its token usage. `inputTokens` is
 * the uncached prompt (Anthropic bills cache reads on a separate counter), so
 * the three terms add.
 */
export function estimateCost(model: ModelName, usage: TokenUsage): number {
  const rate = PRICE_PER_MTOK[model]
  const cacheReadTokens = usage.cacheReadTokens ?? 0
  return (
    (usage.inputTokens * rate.input +
      usage.outputTokens * rate.output +
      cacheReadTokens * rate.cacheRead) /
    1_000_000
  )
}
