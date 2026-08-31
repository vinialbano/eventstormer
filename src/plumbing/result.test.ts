import { describe, expect, it } from 'vitest'
import { andThen, err, isErr, isOk, map, ok, type Result } from './result.ts'

describe('Result', () => {
  it('ok constructs a success discriminant carrying the value', () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 })
  })

  it('err constructs a failure discriminant carrying the error', () => {
    expect(err('boom')).toEqual({ ok: false, error: 'boom' })
  })

  it('isOk / isErr narrow the union', () => {
    const good: Result<number, string> = ok(1)
    const bad: Result<number, string> = err('no')

    expect(isOk(good)).toBe(true)
    expect(isErr(good)).toBe(false)
    expect(isOk(bad)).toBe(false)
    expect(isErr(bad)).toBe(true)

    if (isOk(good)) {
      // narrowing: `.value` is reachable without a cast
      expect(good.value).toBe(1)
    }
    if (isErr(bad)) {
      expect(bad.error).toBe('no')
    }
  })

  it('map applies the function to an ok value', () => {
    expect(map(ok(2), (value) => value * 3)).toEqual({ ok: true, value: 6 })
  })

  it('map leaves an err untouched and does not call the function', () => {
    let called = false
    const result = map(err<string>('bad') as Result<number, string>, (value) => {
      called = true
      return value * 3
    })

    expect(result).toEqual({ ok: false, error: 'bad' })
    expect(called).toBe(false)
  })

  it('andThen chains a fallible step on an ok', () => {
    const result = andThen(ok(4), (value) => (value > 0 ? ok(value + 1) : err('negative')))

    expect(result).toEqual({ ok: true, value: 5 })
  })

  it('andThen short-circuits on an err without calling the function', () => {
    let called = false
    const result = andThen(err<string>('first') as Result<number, string>, (value) => {
      called = true
      return ok(value)
    })

    expect(result).toEqual({ ok: false, error: 'first' })
    expect(called).toBe(false)
  })
})
