/**
 * The one place the capture screen speaks HTTP. Every store cold-loads through
 * `getJson`; every mutation is a plain `postJson`. Named `client.ts`, never
 * `http.ts` / `data.ts` — those names belong to server route and data-access
 * files, and `ui-does-not-import-server-code` forbids the app importing one.
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
