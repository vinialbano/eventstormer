# Tooling gotchas — TypeScript, ESLint, dependency-cruiser, CI

Read this before touching `tsconfig.json`, `eslint.config.ts`, `.dependency-cruiser.cjs`,
`vite.config.ts`, `.npmrc`, `package.json`, or `.github/workflows/{ci,release}.yml`. Every fact
here was found by breaking it first, not by reading documentation — several contradicted the
published docs for the installed version.

## TypeScript

- **Pinned to `6.0.3`, and `typescript@latest` (7.0.2) will break the build.**
  `typescript-eslint@8`'s peer range is `>=4.8.4 <6.1.0`, so TS 7 kills every type-aware lint
  rule — the exact sensors this repo depends on. Under pnpm's strict peers it hard-fails.
  Do not "upgrade" TypeScript.
- **`baseUrl` is deprecated in TS 6** and errors out. Paths use `./src/*` directly.
- **`module` is `"preserve"`, and there is no `moduleResolution` line** — `preserve` implies
  `bundler` resolution and `esModuleInterop`. Do not "fix" this by adding them back.
- **`moduleDetection: "force"` is load-bearing.** Without it, two files that import nothing share
  a global scope and identical top-level `const` names collide with TS2451, pointing at a file
  nobody touched.
- **One-off `scripts/*.ts` must stay in `tsconfig.json` `include`.** ESLint's `projectService`
  rejects any `.ts` file that no tsconfig covers, so a script outside `include` fails the lint
  gate before it runs. Run scripts with `jiti` (`pnpm exec jiti scripts/foo.ts`) — it resolves
  the `~/` path alias; `node --strip-types` and vite-node do not. `scripts/` sits outside `src/`,
  so dependency-cruiser never scans it.

## dependency-cruiser

- **Rules must match `(?:^|/)node_modules/<pkg>/`, never `^node_modules/`.** pnpm resolves to
  `node_modules/.pnpm/hono@4.13.4/node_modules/hono/…`, so a `^` anchor matches nothing and the
  rule silently passes forever. **After editing an architecture rule, plant a violation and
  confirm it fails.**
- **Do not narrow `enhancedResolveOptions.extensions`.** The default list covers
  `.d.ts`/`.tsx`/`.mts`/`.json`; narrowing it makes those imports unresolvable and therefore
  invisible to the architecture rules — the same silent-pass failure as the regex bug above.

## ESLint

- **Use `defineConfig` from `eslint/config`, never `tseslint.config()`** — the latter is
  deprecated. Inside `extends`, preset arrays go in **un-spread**; the top level of
  `defineConfig([...])` still takes a plain array.
- **Do not exclude `*.config.ts` from type-aware linting.** It is in tsconfig's `include`, so
  excluding it silently disables `no-floating-promises` and `no-deprecated` on `vite.config.ts`
  and `eslint.config.ts`. Only `.js`/`.cjs`/`.mjs` sit outside the graph.
- **`.vue` needs `extraFileExtensions: ['.vue']` and `parserOptions.parser`,** but *not* an
  explicit `parser` line — `eslint-plugin-vue`'s `flat/base` already assigns
  `vue-eslint-parser`. The plugin's own docs omit `extraFileExtensions`; without it every SFC
  fails to parse.
- **`@stylistic/eslint-plugin` is an optional peer of eslint-plugin-vue and is not installed.**
  Its 25 lazily-resolved rules are all disabled under `flat/recommended`. Do not add it.
- **`jiti` is an explicit devDependency on purpose.** ESLint declares it only as an *optional
  peer*, but `eslint.config.ts` cannot load without it. Do not remove it as "unused".
- **`src/app/shims-vue.d.ts` looks deletable and is not.** `vue-tsc` resolves `.vue` imports for
  real and ignores it, but `typescript-eslint` does not run the Vue language plugin — without the
  shim, `import App from './App.vue'` becomes an error type and `no-unsafe-argument` fires.
  Verified both directions. It does not mask real prop types.

## Vite dev server

- **The `/api` dev-server regex needs `(?:\/|$)`.** `@hono/vite-dev-server` documents only an
  additive denylist; the inverted lookahead is our extension. Without the `$` alternative, bare
  `/api` escapes it and Vite answers with the SPA instead of Hono answering 404.
- **The published `@hono/vite-dev-server` README is stale for 0.26.1.** Read
  `node_modules/@hono/vite-dev-server/dist/dev-server.mjs` for the real defaults — the documented
  `exclude` list, `ignoreWatching`, and `base` all differ.
- **Do not enable `coverage.thresholds.autoUpdate` yet.** It rewrites `vite.config.ts` in place
  on any full coverage run, and with no real tests `branches` measures 0/0 → reported as 100% →
  written as a permanent 100% floor. Enable it once real tests exist.

## Toolchain / CI

- **`engine-strict=true` is in `.npmrc` and `engines.node` is in `package.json`.** A
  contributor below Node 22.5 gets a clear install-time refusal instead of a confusing
  `node:sqlite` runtime failure. Don't remove either half.
- **CI has no `version:` on `pnpm/action-setup`, deliberately.** It reads `packageManager`
  from `package.json` via Corepack, so the pnpm pin has exactly one home. Do not add one back.
- **The release workflow's commit and title must be conventional (`chore: version packages`).**
  `changesets/action@v1` defaults to `Version Packages`, which fails both commitlint (`type-empty`
  / `subject-empty`) and the `pr-title` job. The release job also sets `LEFTHOOK=0`: `pnpm install`
  runs `prepare` → lefthook install, and the action's `git commit` / `git push` would otherwise
  fire those hooks. Do not bump `package.json` `version` in a slice PR — that is the version PR's
  job; a pre-bump plus a `minor` changeset ships the next slice's number.

## Installed pins

`nanoid@6.0.1` — id generation, imported only in `src/plumbing/ids.ts` (one seam).
