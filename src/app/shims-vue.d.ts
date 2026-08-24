/**
 * This exists for ESLint, not for vue-tsc.
 *
 * `vue-tsc` runs the Vue language plugin and resolves .vue imports for real, so
 * this ambient declaration is inert during `pnpm typecheck` — verified by
 * planting a wrong prop type and watching TS2769 fire with the file deleted.
 *
 * `typescript-eslint` does NOT run that plugin. Without this, `import App from
 * './App.vue'` resolves to an error type and every type-aware rule downstream
 * reports `no-unsafe-argument`. Deleting this file turns `pnpm lint` red.
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
