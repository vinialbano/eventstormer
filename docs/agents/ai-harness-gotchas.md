# AI SDK / Anthropic gotchas

Read this before touching any facilitator or model-call code. The only model call in the tree
today is `scripts/spike-structured-output.ts`; the facilitator slice is where the rest of this
gets exercised.

- **The system prompt goes in the `instructions` option, not a `system` message.** `ai@7`'s
  `generateText` throws `AI_InvalidPromptError` ("System messages are not allowed … Use the
  instructions option instead") if a system role appears in `messages`.
- **`generateObject` is deprecated.** Use `generateText` + `Output.array({ element: schema })`.
- **Pin `providerOptions: { anthropic: { structuredOutputMode: 'outputFormat' } }`.** On the
  default `'auto'` a discriminated union can route through `jsonTool` and fail with
  `Schema type 'oneOf' is not supported`. This is the single biggest risk to the
  discriminated-union design — get it wrong and the whole approach silently doesn't work.
- **Do not set `temperature` on Opus 5 or Sonnet 5** — it is silently stripped. Use
  `output_config.effort` instead, and never claim the model runs at temperature 0.
- **Zod constraints do not reach the model.** `min`, `max`, `pattern`, `.refine()` are stripped
  from the schema the provider sees. Mirror every rule into `.describe()` text. Zod still enforces
  locally, so violations surface as `NoObjectGeneratedError` — a real error path, handle it.
- **Read `result.warnings` on every model call** and log them. Settings are dropped silently.
- **Model ids take no date suffix**: `claude-opus-5`, never `claude-opus-5-2026xxxx`.
- **Anthropic structured output caps optional properties at ~24 across the whole schema.** Every
  `.optional()` and every `z.literal(1).default(1)` counts — the `v` version fields on the
  operation union alone blow the limit (the spike hit "too many optional parameters (41), limit
  24"). The facilitator cannot send `z.array(Operation)`; it sends a **hand-shaped projection** of
  the storage schema — only the block kinds it proposes, `v` dropped (the app stamps it on
  append), `reference` as `z.string()`. Mirror every constraint into `.describe()` as usual.
- **No empty schemas.** `z.unknown()` / `z.any()` serialize to `{}` and the request fails with
  HTTP 400 "Empty schema … not supported". Type every field concretely.

## Installed pins

- `ai@7.0.77`, `@ai-sdk/anthropic@4.0.41` — dev-only; the spike is the sole consumer until the
  facilitator slice mounts a real call path.
- `zod@4.4.3` — a direct `dependencies` entry (the operation-schema SSOT), the one vendor package
  a `domain/` module may import.
