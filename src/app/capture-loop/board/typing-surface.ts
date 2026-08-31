/** True when a key event is aimed at a field that should receive the character. */
export const isTypingSurface = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}
