import { describe, expect, it, vi } from 'vitest'
import * as client from '../client.ts'
import { closeSession, recordChosenProblem, recordStakeholderCheck } from './close.ts'

// Suite: transport close
// Invariant: each ceremony write hits its own route with the given body.
// Boundary IN: the transport adapters with a stubbed client.
// Boundary OUT: composable orchestration (use-close-ceremony.test.ts).

describe('close ceremony transport', () => {
  it('recordStakeholderCheck POSTs the answer to /workshops/:id/stakeholder-check', async () => {
    const postJson = vi.spyOn(client, 'postJson').mockResolvedValue({ ok: true })

    await recordStakeholderCheck('w1', { complete: false, absentNames: ['ops lead'] })

    expect(postJson).toHaveBeenCalledWith('/api/workshops/w1/stakeholder-check', {
      complete: false,
      absentNames: ['ops lead'],
    })
  })

  it('recordChosenProblem POSTs the chosen id to /workshops/:id/chosen-problem', async () => {
    const postJson = vi.spyOn(client, 'postJson').mockResolvedValue({ ok: true })

    await recordChosenProblem('w1', { problemHotSpotId: 'h1' })

    expect(postJson).toHaveBeenCalledWith('/api/workshops/w1/chosen-problem', {
      problemHotSpotId: 'h1',
    })
  })

  it('recordChosenProblem POSTs a skip reason unchanged', async () => {
    const postJson = vi.spyOn(client, 'postJson').mockResolvedValue({ ok: true })

    await recordChosenProblem('w1', { skipReason: 'none-chosen' })

    expect(postJson).toHaveBeenCalledWith('/api/workshops/w1/chosen-problem', {
      skipReason: 'none-chosen',
    })
  })

  it('closeSession POSTs to /sessions/:id/close and returns the close report', async () => {
    const report = { ok: true as const, hotSpotCount: 3, noHotSpotsIsASignal: false }
    const postJson = vi.spyOn(client, 'postJson').mockResolvedValue(report)

    await expect(closeSession('s1')).resolves.toEqual(report)
    expect(postJson).toHaveBeenCalledWith('/api/sessions/s1/close')
  })
})
