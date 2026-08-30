import { z } from 'zod'
import { Operation } from './schema/index.ts'

/**
 * A compile-time compatibility sensor, NOT the facilitator's runtime
 * schema. Per docs/adr/005 the facilitator passes the Zod `Operation` union straight
 * to `Output.object`, and `@ai-sdk/anthropic` runs its own `oneOf → anyOf`
 * sanitiser on the `outputFormat` path. This derivation catches a schema edit
 * that would make the union un-sendable to Anthropic — Zod emits `oneOf` for a
 * discriminated union and Anthropic rejects `oneOf` — at `pnpm check` time.
 *
 * Framework-free: `z.toJSONSchema` is Zod-native.
 */
export const anthropicOperationSchema = (): Record<string, unknown> =>
  z.toJSONSchema(Operation, {
    target: 'draft-2020-12',
    io: 'input',
    unrepresentable: 'throw',
    // A mutating void callback — Zod 4's contract. Runs at every node, so a
    // `oneOf` at any depth (nested discriminated unions included) is rewritten.
    override: (ctx) => {
      const schema = ctx.jsonSchema
      if (Array.isArray(schema.oneOf)) {
        schema.anyOf = schema.oneOf
        delete schema.oneOf
      }
    },
  })
