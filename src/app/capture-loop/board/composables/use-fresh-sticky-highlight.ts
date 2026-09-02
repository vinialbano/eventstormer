import { onMounted, ref, toRef, watch, type MaybeRefOrGetter } from 'vue'
import { useReducedMotion } from '../../shell/composables/use-reduced-motion.ts'
import type { BoardBlockInput } from '../layout.ts'

/** Fresh-sticky settle animation — brief highlight when a block first lands on the wall. */
export const useFreshStickyHighlight = (blocks: MaybeRefOrGetter<BoardBlockInput[]>) => {
  const reduced = useReducedMotion()
  const blockIds = toRef(blocks)
  const seen = new Set<string>()
  const fresh = ref(new Set<string>())
  let mounted = false

  watch(
    () => blockIds.value.map((block) => block.id),
    (ids) => {
      for (const id of ids) {
        if (seen.has(id)) continue
        seen.add(id)
        if (mounted && !reduced.value) {
          fresh.value = new Set(fresh.value).add(id)
          window.setTimeout(() => {
            const next = new Set(fresh.value)
            next.delete(id)
            fresh.value = next
          }, 1000)
        }
      }
    },
    { immediate: true },
  )

  onMounted(() => {
    mounted = true
  })

  return { fresh }
}
