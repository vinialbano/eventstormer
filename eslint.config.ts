import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '*.svg'],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...pluginVue.configs['flat/recommended'],

  {
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

  // Vue SFCs: vue-eslint-parser must own the file, delegating <script> to the TS parser.
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
  },

  {
    rules: {
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

  // Config files are not part of the app's type-aware graph.
  {
    files: ['**/*.config.ts', '**/*.config.js', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'commonjs',
      parserOptions: { projectService: false, project: false },
    },
  },
)
