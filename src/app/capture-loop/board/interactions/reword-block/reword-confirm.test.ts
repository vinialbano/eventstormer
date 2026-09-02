import { describe, expect, it } from 'vitest'
import {
  canConfirmReword,
  confirmIsBusy,
  confirmLoadFailed,
  confirmLoadSucceeded,
  confirmSites,
  idleConfirm,
  startConfirmLoad,
  startConfirmPost,
} from './reword-confirm.ts'

const sites = [{ kind: 'readable-account', path: 'building-blocks' }]

describe('reword-confirm', () => {
  it('starts idle and only allows confirm from ready', () => {
    expect(canConfirmReword(idleConfirm())).toBe(false)
    expect(canConfirmReword(startConfirmLoad())).toBe(false)
    expect(canConfirmReword(confirmLoadFailed())).toBe(false)
    expect(canConfirmReword(confirmLoadSucceeded(sites))).toBe(true)
    expect(canConfirmReword(startConfirmPost(sites))).toBe(false)
  })

  it('marks loading and posting as busy', () => {
    expect(confirmIsBusy(idleConfirm())).toBe(false)
    expect(confirmIsBusy(startConfirmLoad())).toBe(true)
    expect(confirmIsBusy(confirmLoadFailed())).toBe(false)
    expect(confirmIsBusy(confirmLoadSucceeded(sites))).toBe(false)
    expect(confirmIsBusy(startConfirmPost(sites))).toBe(true)
  })

  it('exposes sites only in ready and posting', () => {
    expect(confirmSites(idleConfirm())).toEqual([])
    expect(confirmSites(startConfirmLoad())).toEqual([])
    expect(confirmSites(confirmLoadFailed())).toEqual([])
    expect(confirmSites(confirmLoadSucceeded(sites))).toEqual(sites)
    expect(confirmSites(startConfirmPost(sites))).toEqual(sites)
  })
})
