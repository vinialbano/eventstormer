/**
 * The one HTTP primitive for the capture screen. Only `transport/` imports this
 * module; stores, screens, board, and dock call transport adapters instead.
 */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`HTTP ${String(status)}`)
    this.name = 'HttpError'
  }
}

const parse = (text: string): unknown => (text.length > 0 ? JSON.parse(text) : null)

export const getJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path)
  const body = parse(await response.text())
  if (!response.ok) throw new HttpError(response.status, body)
  return body as T
}

export const postJson = async <T>(path: string, body?: unknown): Promise<T> => {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const parsed = parse(await response.text())
  if (!response.ok) throw new HttpError(response.status, parsed)
  return parsed as T
}
