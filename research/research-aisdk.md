# AI SDK structured output for Nuxt/Nitro + Anthropic — research findings

**Date:** 2026-08-23
**Method:** context7 (`/websites/ai-sdk_dev`), live doc pages on ai-sdk.dev, GitHub issues/PRs on `vercel/ai`, plus **empirical probing of the actually-published packages** (installed into a scratch project). Where I probed source, I say so and give the file/line — that is ground truth, not documentation.

**Versions probed (latest on npm at time of writing):**

| package | version |
|---|---|
| `ai` | **7.0.77** |
| `@ai-sdk/anthropic` | **4.0.41** (published 2026-08-22) |
| `@ai-sdk/vue` | **4.0.77** |
| `@ai-sdk/otel` | **1.0.77** |
| `zod` | **4.4.3** |

> Note up front: the current major is **AI SDK 7**, not 6. There is a `migration-guide-7-0` page (https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0). Several things the team lead's brief assumes are v5/v6-era.

---

## 1. Structured output: which API is current?

### Answer: `generateText` + `Output.object` / `Output.array`. `generateObject` is deprecated.

The AI SDK 6 migration guide states it plainly:

> "generateObject and streamObject have been deprecated and will be removed in a future version. Use generateText and streamText with an output setting instead."
> — https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0

Confirmed in the shipped types of `ai@7.0.77`:

```
node_modules/ai/dist/index.d.ts:7323
 * @deprecated Use `generateText` with an `output` setting instead.
declare function generateObject<...>

node_modules/ai/dist/index.d.ts:7731
 * @deprecated Use `streamText` with an `output` setting instead.
declare function streamObject<...>
```

So: **still exported and callable in v7, but formally deprecated.** A codemod is offered by the migration guide.

Rationale given by the docs: unification lets you combine multi-step tool-calling loops *and* a validated structured output in the same request — `generateObject` could not do that.

### The `Output` surface

From https://ai-sdk.dev/docs/reference/ai-sdk-core/output — probed exports of `ai@7.0.77` confirm exactly five: `Output.array`, `Output.choice`, `Output.json`, `Output.object`, `Output.text`.

| Output | parameters (verbatim from the reference page) |
|---|---|
| `Output.text()` | no parameters |
| `Output.object()` | `schema: FlexibleSchema<OBJECT>`, `name?: string`, `description?: string` |
| `Output.array()` | `element: FlexibleSchema<ELEMENT>`, `name?: string`, `description?: string` |
| `Output.choice()` | `options: Array<CHOICE>`, `name?: string`, `description?: string` |
| `Output.json()` | `name?: string`, `description?: string` |

`Output.array` is the direct analogue of the old `output: 'array'` mode. It returns `Array<ELEMENT>` on `result.output`, and on `streamText` it exposes an `elementStream` that yields **only fully-validated elements**:

```ts
import { generateText, Output } from 'ai';

const { output } = await generateText({
  model: yourModel,
  output: Output.array({
    element: z.object({ location: z.string(), temperature: z.number(), condition: z.string() }),
  }),
  prompt: 'List the weather for San Francisco and Paris.',
});
```
— https://ai-sdk.dev/docs/reference/ai-sdk-core/output

The old string-literal modes (`'object' | 'array' | 'enum' | 'no-schema'`) still exist, but **only on the deprecated `generateObject`/`streamObject`** (`ai/dist/index.d.ts:7325`, the `OUTPUT extends 'object' | 'array' | 'enum' | 'no-schema'` type parameter). On the new path, `'enum'` becomes `Output.choice` and `'no-schema'` becomes `Output.json`.

### Schema-validation failure: how it surfaces

Two error classes, both with `isInstance` statics:

- **`NoObjectGeneratedError`** — the model produced text that could not be parsed or did not validate. Fields: `cause`, `text`, `response`, `usage`, `finishReason`.
- **`NoOutputGeneratedError`** — no output at all (e.g. finished on tool-calls rather than stop).

```ts
import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from 'ai';

try {
  const result = await generateText({ model, output: Output.object({ schema }), prompt });
  console.log(result.output);
} catch (error) {
  if (NoObjectGeneratedError.isInstance(error)) {
    console.log('Cause:', error.cause);       // JSONParseError or TypeValidationError
    console.log('Text:', error.text);
    console.log('Response:', error.response);
    console.log('Usage:', error.usage);
    console.log('Finish Reason:', error.finishReason);
  } else if (NoOutputGeneratedError.isInstance(error)) { /* ... */ }
}
```
— https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-no-object-generated-error and https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data

### Is there automatic repair? **No — and this is a real regression on the new path.**

- `repairText` (and its deprecated alias `experimental_repairText`) **exist only on `generateObject` / `streamObject`**. Verified in `ai@7.0.77`:
  ```
  node_modules/ai/dist/index.d.ts:7358   repairText?: RepairTextFunction;
  node_modules/ai/dist/index.d.ts:7365   experimental_repairText?: RepairTextFunction;   // @deprecated alias
  ```
  Both occurrences are inside the `generateObject` options object (7325+) and the `streamObject` options object (7733+). **`generateText` has no such option**, and none of the `Output.*` factories accept one (confirmed against the Output reference page and against the `.d.ts`).

- This is a known, acknowledged gap: **https://github.com/vercel/ai/issues/11696** — "experimental_repairText does not exist for generateText" (reported against `ai@6.0.3`). Maintainer `aayush-kapoor`: *"we are still discussing internally if we need to bring back repairText for generate text function."* Issue was **closed as a Feature request**, not fixed.

- The **official workaround** the maintainers point at is `extractJsonMiddleware()` (added in https://github.com/vercel/ai/pull/11586), wrapped around the model. Verified exported from `ai@7.0.77`. Maintainer `lgrammel` posted this exact pattern:

  ```ts
  import { extractJsonMiddleware, generateText, Output, wrapLanguageModel } from 'ai';

  const { output } = await generateText({
    model: wrapLanguageModel({ model: /* … */, middleware: extractJsonMiddleware() }),
    output: Output.object({ schema: z.object({ /* … */ }) }),
    prompt: '…',
  });
  ```
  The maintainer notes the middleware's transform function can be customised.

- There is also a cookbook recipe using the third-party `jsonrepair` library: https://ai-sdk.dev/cookbook/node/repair-json-with-jsonrepair

- **Retries:** `maxRetries` exists as a standard call setting, default `2` (https://ai-sdk.dev/docs/ai-sdk-core/settings). **I could not verify that `maxRetries` retries on *schema-validation* failure** — the docs describe it as retries for failed requests. Treat it as transport-level retry, not validation retry, until proven otherwise.

---

## 2. Zod discriminated unions as an output schema

### Zod 4 is supported

> "Supported schema formats include Zod (v3 and v4), Valibot, Standard JSON Schema compatible schemas, and raw JSON schemas."
> — https://ai-sdk.dev/docs/foundations/tools

### `z.discriminatedUnion` emits `oneOf` — and Anthropic's API does not accept `oneOf`

**Empirically confirmed.** Running `zodSchema()` from `ai@7.0.77` on a `z.discriminatedUnion('type', [...])` under `zod@4.4.3` produces:

```json
{ "type": "array", "items": { "oneOf": [ {…}, {…} ] } }
```

(`z.toJSONSchema()` natively produces the same `oneOf`.)

This caused a live production breakage: **https://github.com/vercel/ai/issues/12876** — *"Bug: Schema type 'oneOf' is not supported"*, reproducing with `anthropic('claude-haiku-4-5-20251001')` + `Output.object` + a discriminated union, on `ai@6.0.39` / `@ai-sdk/anthropic@3.0.47`. Maintainer `lgrammel` reproduced it against the live Anthropic API and got HTTP 400: `output_format.schema: Schema type 'oneOf' is not supported`.

**The issue is still OPEN**, and the community PRs (#12903 open, #12954 closed unmerged) were never merged. **However** — and this is the important part — the current published `@ai-sdk/anthropic@4.0.41` **does** convert `oneOf` → `anyOf`. Verified in the shipped bundle:

```js
// node_modules/@ai-sdk/anthropic/dist/index.js:3538-3542  (src/sanitize-json-schema.ts)
if (schema.anyOf != null) {
  result.anyOf = schema.anyOf.map(sanitizeDefinition);
} else if (schema.oneOf != null) {
  result.anyOf = schema.oneOf.map(sanitizeDefinition);   // ← oneOf rewritten to anyOf
}
```

**Caveat — the conversion is applied on ONE path only.** Verified by grepping call sites:

- `sanitizeJsonSchema(responseFormat.schema)` is applied at `dist/index.js:3932`, inside the `output_config.format = { type: 'json_schema', schema: … }` branch — i.e. the **native structured-output (`outputFormat`) path**.
- Tool schemas are passed **raw**: `dist/index.js:1646` — `input_schema: tool.inputSchema`, with no sanitisation.

Consequence: if the request falls back to the **`jsonTool`** path (see §3), your discriminated union goes to the API as `oneOf` and you get the 400. The fallback is chosen automatically when the model does not support native structured output. **Pin `structuredOutputMode: 'outputFormat'` and use a model whose `supportsStructuredOutput` is `true`** (table in §3).

I did **not** make a live Anthropic API call to confirm the 400 vs. success end-to-end; this is a source-level determination.

### `sanitizeJsonSchema` is an allowlist — constraints are silently downgraded to prose

This matters a lot for your "the schema is enforced" claim. `sanitizeSchema` (`dist/index.js:3508-3586`) rebuilds the schema from scratch and copies only: `$ref`, `$schema`, `$id`, `title`, `description`, `default`, `const`, `enum`, `type`, `anyOf`, `allOf`, `definitions`, `$defs`, `properties`, `additionalProperties` (always forced to `false`), `required`, `items`, and `format` **only if it is in a fixed allowlist**:

```js
// dist/index.js:3471
var SUPPORTED_STRING_FORMATS = new Set([
  'date-time','time','date','duration','email','hostname','uri','ipv4','ipv6','uuid'
]);
```

Everything else — `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`, `minLength`, `maxLength`, `pattern`, `minItems`, `maxItems`, `uniqueItems`, `minProperties`, `maxProperties`, `not`, plus any non-allowlisted `format` — is stripped from the schema sent to Anthropic and **appended to the `description` as English text** (`DESCRIPTION_CONSTRAINT_KEYS`, `dist/index.js:3483`; `getConstraintDescription`, `dist/index.js:3588`).

**So:** `z.string().min(1)`, `z.array(...).min(1)`, `z.string().uuid()` (that one survives), `z.number().int().positive()` — the provider does **not** enforce these. It is *hinted* to obey them. The AI SDK still validates the final parsed object against your Zod schema locally, so a violation becomes a `NoObjectGeneratedError` with `cause` = `TypeValidationError`. That is fail-loud, which is what you want — but it means constraint violations are a **runtime error path you must handle**, not something the provider prevents.

### Constructs that do NOT survive the conversion

Verified empirically with `zodSchema()` from `ai@7.0.77`:

- **`.brand()`** — erased. `z.string().brand('Id')` → `{"type":"string"}`. Harmless (branding is type-level only), but the model gets no signal.
- **`.refine()` / `.superRefine()`** — **silently vanish**. `z.number().refine(v => v > 0, 'pos')` → `{"type":"number"}`. The model is never told. Zod still enforces it locally → `NoObjectGeneratedError`. **This is the biggest silent gap for your design.** If a business rule lives in a `.refine()`, the model cannot see it; put it in `.describe()` too.
- **Recursive types (`z.lazy`)** — need `zodSchema(schema, { useReferences: true })`. From https://ai-sdk.dev/docs/reference/ai-sdk-core/zod-schema: *"Enables support for references in the schema. This is required for recursive schemas, e.g. with `z.lazy`. However, not all language models and providers support such references. Defaults to `false`."* Anthropic's sanitizer does preserve `$ref`/`$defs`/`definitions` (`dist/index.js:3511`, `3546`, `3555`), so it may work — **unverified against the live API**.
- **`.optional()`** — the docs repeatedly warn to prefer `.nullable()`: *"Use `.nullable()` instead of `.optional()` in Zod schemas to ensure compatibility with providers that enforce strict schema validation."* (https://ai-sdk.dev/docs/ai-sdk-core/prompt-engineering). That guidance is stated for OpenAI strict mode; **I did not find it stated as an Anthropic requirement**, and Anthropic's sanitizer does copy `required` faithfully. Following it is cheap insurance.
- **`z.union` / `z.record`** — explicitly unsupported by Google Vertex (*"a subset of the OpenAPI 3.0 schema, which does not support features such as unions or records"* — https://ai-sdk.dev/providers/ai-sdk-providers/google-vertex). Not a constraint for Anthropic, but relevant if you ever swap providers.

**Bundle-size note:** https://github.com/vercel/ai/issues/12762 (open) — Zod adds ~20 kb to the bundle despite Standard JSON Schema support. Server-side only for you, so irrelevant.

---

## 3. `@ai-sdk/anthropic` specifics

### Prompt caching — via `providerOptions.anthropic.cacheControl` on message *parts*

From https://ai-sdk.dev/providers/ai-sdk-providers/anthropic:

```ts
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

const result = await generateText({
  model: anthropic('claude-sonnet-4-5'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'You are a JavaScript expert.' },
        {
          type: 'text',
          text: `Error message: ${errorMessage}`,
          providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
        },
        { type: 'text', text: 'Explain the error message.' },
      ],
    },
  ],
});
```

- Breakpoints can be set on **messages, message parts, system messages, and tools**.
- `{ type: 'ephemeral' }`, or `{ type: 'ephemeral', ttl: '1h' }` for the extended 1-hour TTL.
- The SDK translates message-level `providerOptions` into Anthropic's block-level `cache_control` on the **last** content block of that message (worked example: https://ai-sdk.dev/cookbook/node/dynamic-prompt-caching).
- There is also a call-level `providerOptions.anthropic.cacheControl` handled at `dist/index.js:3948` (`...anthropicOptions?.cacheControl && { cache_control: … }`) — this is a *different, top-level* knob from the per-part one. The docs I read only document the per-part form; **I could not verify what the top-level one does**.

### Token usage, including cache reads/writes

Provider-agnostic shape, from `ai@7.0.77` (`dist/index.d.ts:320`):

```ts
type LanguageModelUsage = {
  inputTokens: number | undefined;
  inputTokenDetails: {
    noCacheTokens:   number | undefined;
    cacheReadTokens: number | undefined;   // ← cache hits
    cacheWriteTokens: number | undefined;  // ← cache writes
  };
  outputTokens: number | undefined;
  outputTokenDetails: { textTokens: number | undefined; reasoningTokens: number | undefined };
  totalTokens: number | undefined;
  raw?: JSONObject;   // provider-shaped passthrough
};
```

Read as `result.usage.inputTokenDetails.cacheReadTokens` / `.cacheWriteTokens`.

**Migration note:** the Anthropic-specific `result.providerMetadata?.anthropic?.cacheCreationInputTokens` was **removed in AI SDK 7** in favour of `usage.inputTokenDetails.cacheWriteTokens` (https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0). Don't write the old form.

### `structuredOutputMode` — a provider option you should set explicitly

From `dist/index.js:1022-1025` (the schema, verbatim comments):

```
 * - `jsonTool`: Use a special 'json' tool to specify the structured output format.
 * - `auto`: Use 'outputFormat' when supported, otherwise use 'jsonTool' (default).
structuredOutputMode: z4.enum(['outputFormat', 'jsonTool', 'auto']).optional(),
```

Docs (https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) restate: `"outputFormat"` uses the `output_format` parameter; `"jsonTool"` uses a special `"json"` tool; `"auto"` is the default.

Selection logic (`dist/index.js:3819-3820`):
```js
const structureOutputMode = anthropicOptions?.structuredOutputMode ?? 'auto';
const useStructuredOutput =
  structureOutputMode === 'outputFormat' ||
  (structureOutputMode === 'auto' && supportsStructuredOutput);
```
On the `jsonTool` fallback (`dist/index.js:3821`) the schema becomes a tool `inputSchema` — **which is the path with no `oneOf` sanitisation**. Hence the recommendation to pin `outputFormat`.

Native structured output sets the beta header `structured-outputs-2025-11-13` (`dist/index.js:1659`).

### Temperature — standard setting, but *ignored* on the newest models

`temperature` is a standard AI SDK call setting: *"The value is passed through to the provider… For most providers, `0` means almost deterministic results"* — https://ai-sdk.dev/docs/ai-sdk-core/settings. Also: *"It is recommended to set either `temperature` or `topP`, but not both."*

**But** — verified in `@ai-sdk/anthropic@4.0.41` (`dist/index.js:3790-3814`):

```js
if (rejectsSamplingParameters) {
  if (temperature != null) {
    warnings.push({ type: 'unsupported', feature: 'temperature',
      details: `temperature is not supported by ${this.modelId} and will be ignored` });
    temperature = void 0;
  }
  // same for topK and topP
}
```

`rejectsSamplingParameters: true` for: **`claude-opus-5`, `claude-sonnet-5`, `claude-fable-5`, `claude-opus-4-8`, `claude-opus-4-7`** (`dist/index.js:5644-5664`).
`false` for `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-sonnet-4-5`, `claude-opus-4-5`, `claude-haiku-4-5`, `claude-opus-4-1`, and the 4.0 family.

**Implication for your product:** if you pick Opus 5 or Sonnet 5, **`temperature: 0` is a no-op and you get a warning in `result.warnings`**. You cannot dial down sampling randomness on those models at all. If per-call reproducibility of the *model's* output matters (as opposed to determinism of applying its output), pick a model in the `rejectsSamplingParameters: false` set — e.g. `claude-sonnet-4-5` — and set `temperature: 0`. **Check `result.warnings` in your route; do not assume `temperature` took effect.**

---

## 4. Vue / Nuxt constraints

### Server side: no constraint whatsoever — correct.

`generateText` / `streamText` / `generateObject` / `streamObject` are exported from the framework-agnostic `ai` package and are plain async functions. Nothing in them is React-coupled. Running them in a Nitro route handler sidesteps the UI-layer gap entirely. **Confirmed** — nothing in the docs or the package types conditions these on a framework.

### Client side: your premises need updating.

The current framework support table (https://ai-sdk.dev/docs/getting-started/navigating-the-library):

| Function | React | Svelte | Vue.js |
|---|---|---|---|
| `useChat` | ✓ | ✓ | ✓ |
| `useChat` tool calling | ✓ | ✗ | ✗ |
| `useCompletion` | ✓ | ✓ | ✓ |
| `useObject` | ✓ | ✓ | ✓ |
| MCP Apps | ✓ | ✗ | ✗ |

- **"`useObject` is React-only" is no longer accurate.** The docs table marks it ✓ for Vue, and `@ai-sdk/vue@4.0.77` exports it — verified: `useObject`, plus a deprecated `experimental_useObject` alias (`node_modules/@ai-sdk/vue/dist/index.d.ts:43`, `:132`).
- **"`useChat` on Vue does not support tool calling" — the docs still say ✗**, but the shipped Vue types tell a more nuanced story. `UseChatHelpers` in `@ai-sdk/vue@4.0.77` (`dist/index.d.ts:93`) picks `'sendMessage' | 'regenerate' | 'stop' | 'resumeStream' | 'addToolOutput' | 'addToolApprovalResponse' | 'clearError'` — i.e. `addToolOutput` and `addToolApprovalResponse` **are** present on Vue. **This is genuinely ambiguous**: docs table says unsupported, package surface says the tool-result and tool-approval methods exist. I did not run a Vue app to settle it. Since your design keeps everything server-side, it does not matter for you — but do not repeat "Vue has no tool calling" as settled fact.

---

## 5. Telemetry — `@ai-sdk/otel`

### Registration

```ts
import { registerTelemetry } from 'ai';
import { OpenTelemetry } from '@ai-sdk/otel';

registerTelemetry(new OpenTelemetry());
```
— https://ai-sdk.dev/docs/ai-sdk-core/telemetry

`registerTelemetry` verified exported from `ai@7.0.77`. `@ai-sdk/otel@1.0.77` exports exactly two symbols: **`OpenTelemetry`** and **`LegacyOpenTelemetry`** (verified by probe; the second is undocumented on the page I read — presumably the pre-GenAI-semconv emitter, **unverified**).

For Next.js the docs say to put this in an `instrumentation.ts` at project root inside `register()`. **The docs page I read gives no Nuxt/Nitro-specific instruction** — a Nitro plugin (`server/plugins/*.ts`) is the natural equivalent, but that is my inference, not a documented statement.

### On by default once registered — yes.

> "Once a telemetry integration is registered, all AI SDK calls emit telemetry events by default."

It is **opt-out per call**: `telemetry: { isEnabled: false }`. Note the option is now `telemetry`, not `experimental_telemetry` — `experimental_telemetry` still exists in `ai@7.0.77` types but is marked `@deprecated Use 'telemetry' instead. This alias will be removed in a future major release.` (`dist/index.d.ts:7373`). Settings include `isEnabled`, `recordInputs`, `recordOutputs`, `functionId` (`dist/index.d.ts:945-963`).

### Span names and structure

Follows OpenTelemetry GenAI semantic conventions:

- `generateText` / `streamText`: root span **`invoke_agent {modelId}`** → step spans **`chat {modelId}`** (one per provider call) → tool spans **`execute_tool {toolName}`**.
- `embed` / `embedMany`: root **`embeddings {modelId}`**, with inner per-batch spans for `embedMany`.

The strings `invoke_agent`, `chat`, `execute_tool`, `embeddings` all verified present in `@ai-sdk/otel@1.0.77`'s bundle.

### Attributes recorded

Full list of `gen_ai.*` attribute names extracted from the shipped `@ai-sdk/otel@1.0.77` bundle:

```
gen_ai.agent.name
gen_ai.client.operation.duration
gen_ai.client.operation.time_per_output_chunk
gen_ai.client.operation.time_to_first_chunk
gen_ai.execute_tool.duration
gen_ai.input.messages
gen_ai.operation.name
gen_ai.output.messages
gen_ai.output.type
gen_ai.provider.name
gen_ai.request.frequency_penalty
gen_ai.request.max_tokens
gen_ai.request.model
gen_ai.request.presence_penalty
gen_ai.request.seed
gen_ai.request.stop_sequences
gen_ai.request.temperature
gen_ai.request.top_k
gen_ai.request.top_p
gen_ai.response.finish_reasons
gen_ai.response.id
gen_ai.response.model
gen_ai.system
gen_ai.system_instructions
gen_ai.tool.call.arguments
gen_ai.tool.call.id
gen_ai.tool.call.result
gen_ai.tool.definitions
gen_ai.tool.name
gen_ai.tool.type
gen_ai.usage.cache_creation.input_tokens
gen_ai.usage.cache_read.input_tokens
gen_ai.usage.input_tokens
gen_ai.usage.output_tokens
```

Token attributes are exactly four: `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`, `gen_ai.usage.cache_read.input_tokens`, `gen_ai.usage.cache_creation.input_tokens`. Note there is **no** total-tokens and **no** reasoning-tokens attribute, even though `LanguageModelUsage` carries both — those you would have to record yourself.

`gen_ai.input.messages` / `gen_ai.output.messages` / `gen_ai.tool.*` payloads are only recorded when `recordInputs` / `recordOutputs` are enabled.

### "Cost is not calculated, token counts only" — **CONFIRMED.**

Zero case-insensitive occurrences of the string `cost` in the entire `@ai-sdk/otel@1.0.77` bundle, and no cost attribute in the list above. The telemetry docs page makes no mention of cost. If you want spend, you compute it from token counts and your own price table.

---

## 6. Model ids

Exact strings, as reported by https://ai-sdk.dev/providers/ai-sdk-providers/anthropic:

```
claude-opus-5
claude-sonnet-5
claude-fable-5
claude-opus-4-8
claude-opus-4-7
claude-opus-4-6
claude-sonnet-4-6
claude-opus-4-5
claude-haiku-4-5
claude-sonnet-4-5
claude-opus-4-1
claude-opus-4-0
claude-sonnet-4-0
```

The shipped `@ai-sdk/anthropic@4.0.41` `index.d.ts` type union additionally includes dated variants:

```
claude-3-haiku-20240307   claude-fable-5            claude-haiku-4-5
claude-haiku-4-5-20251001 claude-opus-4-0           claude-opus-4-1
claude-opus-4-1-20250805  claude-opus-4-20250514    claude-opus-4-5
claude-opus-4-5-20251101  claude-opus-4-6           claude-opus-4-7
claude-opus-4-8           claude-opus-5             claude-sonnet-4-0
claude-sonnet-4-20250514  claude-sonnet-4-5         claude-sonnet-4-5-20250929
claude-sonnet-4-6         claude-sonnet-5
```

Arbitrary strings are also accepted (the type is a union with `string`); capability detection is substring-based (`modelId.includes('claude-opus-5')` etc.).

### Capability table (extracted from `@ai-sdk/anthropic@4.0.41`, `dist/index.js:5644-5745`)

| model id (substring match) | maxOutputTokens | supportsStructuredOutput | rejectsSamplingParameters |
|---|---|---|---|
| `claude-opus-5` | 128000 | **true** | **true** |
| `claude-opus-4-8`, `claude-opus-4-7`, `claude-fable-5`, `claude-sonnet-5` | 128000 | **true** | **true** |
| `claude-sonnet-4-6`, `claude-opus-4-6` | 128000 | **true** | false |
| `claude-sonnet-4-5`, `claude-opus-4-5`, `claude-haiku-4-5` | 64000 | **true** | false |
| `claude-opus-4-1` | 32000 | **true** | false |
| `claude-sonnet-4-*` (other) | 64000 | false | false |
| `claude-opus-4-*` (other) | 32000 | false | false |
| `claude-3-haiku` | 4096 | false | false |
| `claude-instant` / `claude-2` / `claude-3` | 4096 | false | false |

`supportsStructuredOutput: false` means `structuredOutputMode: 'auto'` silently falls back to `jsonTool` — the unsanitised path where your `oneOf` will 400.

---

## What I could NOT verify

1. **No live API call was made.** All Anthropic request-shaping claims are from reading the published `@ai-sdk/anthropic@4.0.41` bundle, not from observing HTTP traffic.
2. Whether `maxRetries` retries on **schema-validation** failure (as opposed to transport failure). Docs are silent.
3. Whether recursive schemas (`z.lazy` + `useReferences: true`) actually work against Anthropic. The sanitizer preserves `$ref`/`$defs`, but that is necessary, not sufficient.
4. What the **call-level** `providerOptions.anthropic.cacheControl` (`dist/index.js:3948`) does, as distinct from the per-part form. Undocumented on the pages I read.
5. What `LegacyOpenTelemetry` from `@ai-sdk/otel` is for.
6. Whether Vue `useChat` tool calling actually works in practice — docs table and package types disagree (see §4). Irrelevant to a server-side design.
7. Whether the still-open issue #12876 has any remaining failure mode on the `outputFormat` path with `@ai-sdk/anthropic@4.0.41`. The sanitizer is present; the issue is stale-open.
8. Nuxt/Nitro-specific telemetry registration. Only Next.js `instrumentation.ts` is documented.

---

## Recommendation for this use case

**The call:**

```ts
// server/api/propose-operations.post.ts
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, Output, NoObjectGeneratedError, NoOutputGeneratedError } from 'ai';
import { z } from 'zod';

const operation = z.discriminatedUnion('kind', [ /* … */ ]);

const result = await generateText({
  model: anthropic('claude-sonnet-4-5'),
  temperature: 0,
  maxOutputTokens: 8000,
  maxRetries: 2,
  output: Output.array({
    element: operation,
    name: 'boardOperation',
    description: 'A single proposed mutation to the EventStorming board.',
  }),
  providerOptions: {
    anthropic: { structuredOutputMode: 'outputFormat' },
  },
  messages: [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        { type: 'text', text: boardSnapshotJson,
          providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } } },
        { type: 'text', text: transcriptSegment },
      ],
    },
  ],
});
```

**Why each choice:**

- **`generateText` + `Output.array`, not `generateObject`.** `generateObject` is `@deprecated` in the shipped v7 types and slated for removal. `Output.array` is the array mode on the current path and gives you `Array<Operation>` directly with every element validated. The one thing you give up is `repairText` — see below.
- **`Output.array` over `Output.object({ schema: z.object({ ops: z.array(...) }) })`.** Array is the native shape for "a list of proposed operations", and if you ever move to `streamText`, `elementStream` yields only *fully validated* elements, which is exactly the semantics a deterministic applier wants.
- **`structuredOutputMode: 'outputFormat'` — pin it, do not leave it on `'auto'`.** This is the single most load-bearing option for you. `oneOf`→`anyOf` sanitisation is applied **only** on the `outputFormat` path (`dist/index.js:3932`); the `jsonTool` fallback passes tool schemas raw (`dist/index.js:1646`) and your discriminated union will 400 with `Schema type 'oneOf' is not supported` (issue #12876). Pinning it makes an unsupported model fail loudly at the API rather than silently taking the broken path.
- **`claude-sonnet-4-5`, not `claude-opus-5` / `claude-sonnet-5`.** Those newer models have `rejectsSamplingParameters: true`: your `temperature: 0` is stripped with a warning and you cannot reduce sampling variance at all. `claude-sonnet-4-5` accepts `temperature`, has `supportsStructuredOutput: true`, and 64k output tokens. If you do choose Opus 5 for capability reasons, drop `temperature` from the call and stop claiming it.
- **`cacheControl` on the board-snapshot part, not the transcript part.** The snapshot is the large, stable prefix; the transcript segment changes every call. Order matters — cache the prefix, vary the suffix. Read the effect back via `result.usage.inputTokenDetails.cacheReadTokens` / `.cacheWriteTokens`.

**Two things to add that are not optional given your determinism claim:**

1. **Inspect `result.warnings` on every call and log/alert on it.** The provider silently drops `temperature`/`topP`/`topK` on some models and emits a warning rather than throwing. If you never read `warnings`, you will believe you are running at temperature 0 when you are not.

2. **Do not rely on Zod constraints being enforced by the provider.** `min`/`max`/`pattern`/`minItems`/`.refine()` are stripped from the schema Anthropic sees — constraints become English in the `description`, and `.refine()` disappears entirely. Mirror every business rule into `.describe()` on the field so the model actually sees it. Zod still enforces them locally, so violations become `NoObjectGeneratedError` — which is the correct fail-loud behaviour, but it is a real error path, not a theoretical one.

**Schema failure handling:**

```ts
try {
  const { output, warnings, usage } = await generateText({ /* as above */ });
  if (warnings?.length) log.warn({ warnings }, 'provider dropped settings');
  return { operations: output };
} catch (error) {
  if (NoObjectGeneratedError.isInstance(error)) {
    // error.cause is JSONParseError or TypeValidationError
    // error.text is the raw model output — log it, it is your only forensic record
    log.error({ cause: error.cause, text: error.text, finishReason: error.finishReason, usage: error.usage });
    throw createError({ statusCode: 422, statusMessage: 'Model produced invalid operations' });
  }
  if (NoOutputGeneratedError.isInstance(error)) {
    throw createError({ statusCode: 502, statusMessage: 'Model produced no output' });
  }
  throw error;
}
```

**On repair:** start **without** it. `Output.array` + native `outputFormat` on a structured-output-capable model should not produce malformed JSON; the failures you will actually see are *semantic* (valid JSON, wrong operation) and no repair function fixes those. Reject and surface. If you do observe parse failures in production, the maintainer-endorsed remedy is `extractJsonMiddleware()`:

```ts
import { extractJsonMiddleware, wrapLanguageModel } from 'ai';
model: wrapLanguageModel({ model: anthropic('claude-sonnet-4-5'), middleware: extractJsonMiddleware() })
```

Do **not** reach back for `generateObject` just to get `repairText`. Trading the supported API for a repair hook you probably will not need is the wrong trade, and it forecloses ever combining tool calls with structured output in one request.

**Telemetry:** register `new OpenTelemetry()` once in a Nitro server plugin, then it is on by default for every call — no per-call flag. Set `telemetry: { functionId: 'propose-operations' }` on the call so the spans are attributable. Confirm: **cost is not computed; you get `gen_ai.usage.input_tokens`, `output_tokens`, `cache_read.input_tokens`, `cache_creation.input_tokens` and nothing else token-wise.** Total and reasoning tokens are available on `result.usage` but are not emitted as span attributes — record them yourself if you need them.

---

## R3 spike — structured-output round-trip probe (Slice 0, S0-27 / S0-28)

**Date:** 2026-08-29
**Probe:** `scripts/spike-structured-output.ts`, run via `pnpm spike:structured-output` (jiti).
**Status: RUN 2026-08-29** (`claude-sonnet-5`, real API) — results in "LIVE RESULTS" below; the
decision is recorded as AD-015. Absent a key the probe prints `skipped — no ANTHROPIC_API_KEY`
and exits 0, so it is safe in CI.

### What the probe pins (ADR-005's exact setup)

- `generateText` + `Output.object({ schema: z.object({ interpretation: z.array(Operation), nextMove }) })`
  — the **object wrapper**, not a bare `Output.array` (ADR-005 §Consequences: "the R3 spike now
  tests the object wrapper, not a bare array").
- `model: anthropic('claude-sonnet-5')` — no date suffix.
- `providerOptions.anthropic.structuredOutputMode: 'outputFormat'` pinned — the only path that runs
  the `oneOf → anyOf` sanitiser.
- **No `temperature`** — Sonnet 5 has `rejectsSamplingParameters: true`; a `temperature` would be
  stripped and surface in `result.warnings`.
- `interpretation` is `z.array(Operation)` where `Operation` is the **real frozen v:1 discriminated
  union** (`src/domain-model-capture/domain/schema/operations.ts`, 20 variants), reached through
  `src/domain-model-capture/api.ts`.
- Prints `result.output`, `result.warnings`, `result.finishReason`, `result.usage`.

The Slice 0 compile-time sensor `src/domain-model-capture/domain/anthropic-contract.ts` + its test
back this up independently: `z.toJSONSchema(Operation, …)` with a mutating `override` rewrites
every `oneOf` at any depth, and the test asserts `JSON.stringify(...)` contains no `"oneOf"` — so
even if a future provider-SDK version dropped its own sanitiser, our derivation still produces an
Anthropic-safe schema.

---

## R3 spike — LIVE RESULTS (2026-08-29, `claude-sonnet-5`, real API)

Run against the live API with a real key. **The core question is answered and two new blockers
surfaced — both matter for Slice 1's facilitator, neither blocks Slice 0.**

### Script fixes needed first (the probe had never been run)

1. **`.env` is not auto-loaded** by a standalone script — added `process.loadEnvFile()` (Node-24
   built-in, no dotenv dep) at the top.
2. **The `~/` tsconfig path alias** is not resolved by `jiti` out of the box — the
   `spike:structured-output` npm script now sets `JITI_TSCONFIG_PATHS=1`.
3. **AI SDK 7 forbids a `system`-role message** in `messages` — "Use the `instructions` option
   instead." Switched to `instructions:` + `prompt:`.

### Run A — the Zod union passed directly (ADR-005's exact shape)

```
AI_APICallError (HTTP 400):
output_config.format.schema: Empty schema ({}) that accepts any JSON value is not
supported. Please specify a concrete type.
```

- **`oneOf → anyOf` is NOT the blocker** — no `oneOf` error ever appears; the provider SDK's
  sanitiser handles it on the `outputFormat` path, as predicted.
- The blocker is **`resolve.reference: z.unknown()`** (deliberately untyped in storage per
  ADR-004) → `z.toJSONSchema` emits `{}` → Anthropic's `output_config` rejects any empty schema.

### Run B — derived JSON Schema with `{}` sub-schemas patched to `{ type: 'string' }`

```
AI_APICallError (HTTP 400):
Schemas contains too many optional parameters (41), which would make grammar
compilation inefficient. Reduce the number of optional parameters in your tool
schemas (limit: 24).
```

- Past the empty-schema error, straight into a **hard Anthropic limit: ≤ 24 optional parameters**
  in a structured-output schema.
- The full 20-variant union has ~41 optionals — dominated by `v: z.literal(1).default(1)` on
  **every** variant (`.default()` ⇒ optional in the input schema), plus `author.proposer`, etc.

### Conclusion — for Slice 1

The facilitator **cannot** pass `z.array(Operation)` (the whole frozen union) to `Output.object`.
It needs a **hand-shaped projection** of the storage schema:

- only the operation kinds the facilitator actually proposes (per the `domain-model-capture`
  canvas: `capture-*`, `reword`, `mark-pivotal`, `annotate`, `raise-hot-spot`, `resolve`,
  `sequence`, `link-cause` — **not** the human-direct edits `place`/`unplace`/`withdraw`/
  `reinstate`/`unsequence`/`unlink-cause`/`unannotate`/`unmark-pivotal`/`reopen`);
- **drop `v`** from the AI contract — the app stamps `OP_SCHEMA_VERSION` on append (AD-012's
  sibling); this alone removes ~20 optionals;
- `reference` concretely typed (`z.string()` — a note/link/id as text);
- `author` supplied by the app, not the model.

This **strengthens AD-010**: the AI contract is not merely a sanitised *view* of the storage
schema — it is a smaller, purpose-built schema. `anthropic-contract.ts`'s compile-time sensor
stays useful as a drift check on the shared *shapes*, but Slice 1 authors the projection
explicitly.

`oneOf → anyOf` round-trip: **not fully confirmed** (never got a clean call) but **not the
problem** — no `oneOf` error at any point. A clean confirmation comes with Slice 1's projection.
