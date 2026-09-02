/**
 * The board deep module's public surface. Shell and dock import only from here —
 * never composables, interactions, or presentation internals.
 */
export { default as BoardWall } from './BoardWall.vue'
export type { BoardBlockInput } from './layout.ts'
