/**
 * The interpretation scheduler — cadence only, no business logic. Each cycle
 * awaits, in sequence, the three interpretation tick functions; a throw in one
 * is logged and the loop continues (S1-27). Recursive `setTimeout` (not
 * `setInterval`) so a slow cycle never overlaps the next. Started by
 * `host/index.ts`; never started in tests — the tick functions are driven
 * directly there.
 */
export interface SchedulerTicks {
  askOpeningQuestion: () => Promise<void>
  interpretContribution: () => Promise<void>
  reconcilePendingDerivations: () => void
}

export const runCycle = async (ticks: SchedulerTicks): Promise<void> => {
  const steps: [string, () => void | Promise<void>][] = [
    ['askOpeningQuestion', ticks.askOpeningQuestion],
    ['interpretContribution', ticks.interpretContribution],
    ['reconcilePendingDerivations', ticks.reconcilePendingDerivations],
  ]
  for (const [name, step] of steps) {
    try {
      await step()
    } catch (error) {
      console.error(`scheduler: ${name} tick failed`, error)
    }
  }
}

export const startScheduler = (
  ticks: SchedulerTicks,
  intervalMs: number,
): { stop: () => void } => {
  let stopped = false
  let handle: ReturnType<typeof setTimeout> | undefined

  const loop = (): void => {
    if (stopped) return
    void runCycle(ticks).finally(() => {
      if (!stopped) handle = setTimeout(loop, intervalMs)
    })
  }
  loop()

  return {
    stop: () => {
      stopped = true
      if (handle !== undefined) clearTimeout(handle)
    },
  }
}
