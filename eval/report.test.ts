import { describe, expect, it } from 'vitest'
import { formatEvalTable, spliceEvalResults } from './report.ts'

const MARKED = `intro
<!-- eval:results -->
placeholder
<!-- /eval:results -->
outro`

const TABLE = `| Case | Assertion | Passed |
| --- | --- | --- |
| kind | kind | 4/5 |`

describe('spliceEvalResults', () => {
  it('replaces the region between the README markers with the table', () => {
    expect(spliceEvalResults(MARKED, TABLE)).toBe(`intro
<!-- eval:results -->
${TABLE}
<!-- /eval:results -->
outro`)
  })

  it('is idempotent — splicing the same table twice yields the same README', () => {
    const once = spliceEvalResults(MARKED, TABLE)
    expect(spliceEvalResults(once, TABLE)).toBe(once)
  })

  it('throws when the markers are missing', () => {
    expect(() => spliceEvalResults('# No markers', TABLE)).toThrow(
      'README is missing <!-- eval:results --> / <!-- /eval:results --> markers',
    )
  })

  it('throws when the end marker precedes the start marker', () => {
    const reversed = `outro
<!-- /eval:results -->
placeholder
<!-- eval:results -->
intro`
    expect(() => spliceEvalResults(reversed, TABLE)).toThrow(
      'README is missing <!-- eval:results --> / <!-- /eval:results --> markers',
    )
  })
})

describe('formatEvalTable', () => {
  it('renders only the header when there are no rows', () => {
    expect(formatEvalTable([])).toBe('| Case | Assertion | Passed |\n| --- | --- | --- |')
  })

  it('renders each assertion as k/N with no aggregate pass-rate', () => {
    const markdown = formatEvalTable([
      { caseId: 'kind', assertion: 'kind', passed: 4, runs: 5 },
      { caseId: 'near-miss', assertion: 'notFlagPhase', passed: 5, runs: 5 },
    ])
    expect(markdown).toBe(`| Case | Assertion | Passed |
| --- | --- | --- |
| kind | kind | 4/5 |
| near-miss | notFlagPhase | 5/5 |`)
    expect(markdown).not.toMatch(/%/)
  })
})
