export interface EvalTableRow {
  caseId: string
  assertion: string
  passed: number
  runs: number
}

const EVAL_RESULTS_START = '<!-- eval:results -->'
const EVAL_RESULTS_END = '<!-- /eval:results -->'

export const formatEvalTable = (rows: readonly EvalTableRow[]): string => {
  const header = '| Case | Assertion | Passed |\n| --- | --- | --- |'
  const body = rows
    .map((row) => `| ${row.caseId} | ${row.assertion} | ${String(row.passed)}/${String(row.runs)} |`)
    .join('\n')
  return body === '' ? header : `${header}\n${body}`
}

export const spliceEvalResults = (readme: string, table: string): string => {
  const startAt = readme.indexOf(EVAL_RESULTS_START)
  const endAt = readme.indexOf(EVAL_RESULTS_END)
  if (startAt === -1 || endAt === -1 || endAt < startAt) {
    throw new Error(
      `README is missing ${EVAL_RESULTS_START} / ${EVAL_RESULTS_END} markers — restore them before \`pnpm eval --report\`.`,
    )
  }
  const before = readme.slice(0, startAt + EVAL_RESULTS_START.length)
  const after = readme.slice(endAt)
  return `${before}\n${table.trim()}\n${after}`
}
