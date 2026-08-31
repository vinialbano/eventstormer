import { it } from 'vitest'
import { runEval } from './run.ts'

it(
  'runs four F11 cases against the live facilitator',
  async () => {
    const report = process.argv.includes('--report') || process.env.EVAL_REPORT === '1'
    await runEval({ report })
  },
  600_000,
)
