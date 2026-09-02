import { onScopeDispose, ref } from 'vue'

/**
 * Tracks `prefers-reduced-motion: reduce`. The one authored moment — the
 * card-to-sticky flight and its highlight wash — is skipped when this is true
 * (DESIGN.md §6); global CSS already neutralises incidental transitions.
 */
export const useReducedMotion = () => {
  const query =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null

  const reduced = ref(query?.matches ?? false)

  if (query !== null) {
    const onChange = (error: MediaQueryListEvent): void => {
      reduced.value = error.matches
    }
    query.addEventListener('change', onChange)
    onScopeDispose(() => {
      query.removeEventListener('change', onChange)
    })
  }

  return reduced
}
