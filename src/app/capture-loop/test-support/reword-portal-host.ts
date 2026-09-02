/** Simulates CaptureScreen's declared `#reword-portal` host for component tests. */
export const mountRewordPortalHost = (): void => {
  if (document.querySelector('#reword-portal') !== null) return
  const host = document.createElement('div')
  host.id = 'reword-portal'
  document.body.append(host)
}

export const unmountRewordPortalHost = (): void => {
  document.getElementById('reword-portal')?.remove()
}
