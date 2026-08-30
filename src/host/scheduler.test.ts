import { afterEach, describe, expect, it, vi } from 'vitest'
import { runCycle, startScheduler, type SchedulerTicks } from './scheduler.ts'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('scheduler (S1-27)', () => {
  it('runs every tick in a cycle even when an earlier one throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const calls: string[] = []
    const ticks: SchedulerTicks = {
      askOpeningQuestion: () => {
        calls.push('ask')
        throw new Error('boom')
      },
      interpretContribution: () => {
        calls.push('interpret')
        return Promise.resolve()
      },
      reconcilePendingDerivations: () => {
        calls.push('reconcile')
      },
    }

    await runCycle(ticks)

    expect(calls).toEqual(['ask', 'interpret', 'reconcile'])
  })

  it('keeps scheduling the next cycle after a throwing one', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.useFakeTimers()
    let cycles = 0
    const { stop } = startScheduler(
      {
        askOpeningQuestion: () => {
          cycles += 1
          throw new Error('x')
        },
        interpretContribution: () => Promise.resolve(),
        reconcilePendingDerivations: () => undefined,
      },
      10,
    )

    await vi.advanceTimersByTimeAsync(35)
    stop()

    expect(cycles).toBeGreaterThanOrEqual(3)
  })

  it('stops firing once stop() is called', async () => {
    vi.useFakeTimers()
    let cycles = 0
    const { stop } = startScheduler(
      {
        askOpeningQuestion: () => {
          cycles += 1
          return Promise.resolve()
        },
        interpretContribution: () => Promise.resolve(),
        reconcilePendingDerivations: () => undefined,
      },
      10,
    )

    await vi.advanceTimersByTimeAsync(15)
    stop()
    const seen = cycles
    await vi.advanceTimersByTimeAsync(50)

    expect(cycles).toBe(seen)
  })
})
