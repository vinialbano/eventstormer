import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import pluginUnicorn from 'eslint-plugin-unicorn'
import globals from 'globals'

// `tseslint.config()` is deprecated in favour of ESLint core's `defineConfig()`.
// Inside `extends`, preset arrays go in UN-SPREAD — `extends` absorbs arrays,
// while the top level of defineConfig([...]) does not.
export default defineConfig([
  // node_modules and .git are already in ESLint's defaults.
  // `.claude/` holds vendored agent tooling (skill bundles, hook scripts), not
  // project source — outside every gate in `pnpm check`.
  globalIgnores(['dist/**', 'coverage/**', '*.svg', '.claude/**']),

  {
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      pluginVue.configs['flat/recommended'],
    ],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // The Vue app runs in a browser; everything else runs in Node.
  {
    files: ['src/app/**/*.{ts,vue}'],
    languageOptions: { globals: { ...globals.browser } },
  },

  // eslint-plugin-vue's flat/base already assigns vue-eslint-parser, so there is
  // no explicit `parser` line here. Two things it does NOT do: delegate <script>
  // to the TS parser (it defaults to espree), and tell the project service that
  // .vue is a real extension. Drop `extraFileExtensions` and every SFC fails
  // with "not found by the project service because the extension is non-standard".
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
    },
  },

  {
    plugins: { unicorn: pluginUnicorn },
    rules: {
      // Identifiers are spelled out in full — terse single-letter and abbreviated
      // names are rejected so the derived model reads like prose.
      'id-length': ['error', { min: 2, properties: 'never', exceptions: ['_'] }],
      // Agent-facing sensors — not the unicorn recommended kitchen sink.
      // Bare eslint-disable, missing `node:`, `throw Error()`, empty Error,
      // forEach, reverse().find, mutating sort, await-in-Promise.all.
      'unicorn/no-abusive-eslint-disable': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/throw-new-error': 'error',
      'unicorn/error-message': 'error',
      'unicorn/no-for-each': 'error',
      'unicorn/prefer-array-last-methods': 'error',
      'unicorn/no-array-sort': 'error',
      'unicorn/no-await-in-promise-methods': 'error',
      'unicorn/name-replacements': [
        'error',
        {
          checkFilenames: false,
          checkProperties: false,
          allowList: {
            deps: true,
            Deps: true,
            db: true,
            Db: true,
            props: true,
            Props: true,
            ref: true,
            refs: true,
            params: true,
            env: true,
            args: true,
            fn: true,
            ok: true,
            err: true,
            isOk: true,
            isErr: true,
          },
        },
      ],

      // A shadowed inner binding can turn an identity check into an `x === x`
      // tautology that still type-checks; these two rules make that class a lint
      // error rather than a shippable regression.
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      'no-self-compare': 'error',

      // `{ sessionId: sessionId }` is a spelled-out name pretending to be a
      // rename; shorthand is what it would be written as by hand.
      'object-shorthand': ['error', 'properties'],

      // Formatting is not this tool's job and the noise trains agents to ignore it.
      'vue/singleline-html-element-content-newline': 'off',
      'vue/max-attributes-per-line': 'off',

      // The mechanism behind "illegal states unrepresentable": Zod defines each
      // discriminated union once, this catches every branch forgotten when a
      // variant is added. Neither half works alone.
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { allowDefaultCaseForExhaustiveSwitch: false, requireDefaultForNonUnion: true },
      ],
      // Agents drop `await`, especially around store actions and AI SDK calls.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },

  // Only plain-JS tooling sits outside the type-aware graph. *.config.ts IS in
  // tsconfig's include, so it stays fully type-checked — excluding it silently
  // disabled no-floating-promises and no-deprecated on vite.config.ts.
  {
    files: ['**/*.{js,cjs,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { projectService: false, project: false },
    },
  },
  // commitlint.config.js is ESM in a "type": "module" package; only .cjs is not.
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },
])
