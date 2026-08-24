# AI SDK / Anthropic gotchas

Read this before touching any facilitator or model-call code. None of this exists in the repo
yet — this file is here so the first sitting that builds it doesn't relearn these the hard way.

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

## Not installed yet

Install at the verified pins below, in the sitting that builds the facilitator, so `knip` stays a
true signal rather than a wall of false positives:

- `ai@7.0.77`
- `@ai-sdk/anthropic@4.0.41`
- `zod@4.4.3`
