import { expect, test, type Page } from '@playwright/test'

/**
 * Core capture-loop smoke (ADR-008): create a workshop, accept scope, narrate three
 * contributions, accept each proposal, and assert three stickies in the backlog.
 * One slim timeline beat (place + sequence) covers the cross-zone macro path;
 * reword, withdraw, readable-account walk, and reload persistence stay in unit
 * tests. ADR-007 no-optimism is in `capture-loop-no-optimism.spec.ts`.
 *
 * Scripted facilitator: `FACILITATOR_MODE=scripted` + `e2e/fixtures/facilitator.json`.
 */
test.describe.serial('capture loop', () => {
  test.setTimeout(120_000)

  let page: Page
  const consoleIssues: string[] = []

  const assertNoConsoleIssues = (): void => {
    expect(consoleIssues).toEqual([])
    consoleIssues.length = 0
  }

  const scopeStatement = 'A public library that lends books to registered members.'
  const originalLabel = 'Book borrowed'
  const sequencedLabel = 'Book returned'
  const narration: [string, string, string] = [
    'Book borrowed when a member takes a book from the library.',
    'The member brings the book back to the desk.',
    'Someone new signs up for a membership.',
  ]

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        consoleIssues.push(`${message.type()}: ${message.text()}`)
      }
    })
  })

  test.afterAll(async () => {
    await page.close()
  })

  test.describe('workshop setup', () => {
    test('creates a workshop, starts a session, and accepts scope', async () => {
      await page.goto('/')

      await page.getByLabel('Your name').fill('Maria')
      await page.getByRole('button', { name: 'Start workshop' }).click()
      await expect(page).toHaveURL(/\/workshops\/[\w-]+$/)

      await page.getByRole('button', { name: 'Start session' }).click()

      await expect(page.getByText(scopeStatement)).toBeVisible({ timeout: 20_000 })
      await expect(page.getByText(/What business are we mapping/)).toBeVisible()
      await page.getByRole('button', { name: 'Accept' }).click()
      await expect(page.getByText(scopeStatement)).toBeHidden()
      await expect(page.getByText('describe the first thing that happens')).toBeVisible()
      assertNoConsoleIssues()
    })
  })

  test.describe('board mutations', () => {
    test('narrates contributions and accepts each proposal onto the backlog', async () => {
      const composer = page.getByRole('textbox', { name: 'Describe what happens' })
      const backlog = page.getByRole('list', { name: 'Backlog' })
      const beats = [
        { line: narration[0], label: originalLabel },
        { line: narration[1], label: sequencedLabel },
        { line: narration[2], label: 'Member registered' },
      ]

      for (const { line, label } of beats) {
        await composer.fill(line)
        await composer.press('Enter')
        await expect(composer).toHaveValue('')
        await expect(page.getByRole('group', { name: `Proposal: ${label}` })).toBeVisible({
          timeout: 20_000,
        })
        await page
          .getByRole('group', { name: `Proposal: ${label}` })
          .getByRole('button', { name: 'Accept' })
          .click()
        await expect(backlog.getByLabel(`event: ${label}`)).toBeVisible({ timeout: 20_000 })
      }

      await expect(backlog.getByRole('listitem')).toHaveCount(3)
      assertNoConsoleIssues()
    })
  })

  test.describe('timeline', () => {
    test('places and sequences two events onto the timeline', async () => {
      const backlog = page.getByRole('list', { name: 'Backlog' })
      const timeline = page.getByRole('region', { name: 'Timeline' })

      await page.getByRole('button', { name: 'Collapse the dock' }).click()
      await backlog.getByLabel(`event: ${originalLabel}`).click()
      await page.getByRole('button', { name: 'Place on timeline' }).click()
      await expect(timeline.getByText(originalLabel, { exact: true })).toBeVisible({ timeout: 20_000 })
      await expect(backlog.getByLabel(`event: ${originalLabel}`)).toHaveCount(0)

      await backlog.getByLabel(`event: ${sequencedLabel}`).click()
      await page.getByRole('button', { name: 'Sequence after' }).click()
      await expect(timeline.getByText(sequencedLabel, { exact: true })).toBeVisible({ timeout: 20_000 })
      await expect(backlog.getByLabel(`event: ${sequencedLabel}`)).toHaveCount(0)
      await expect(backlog.getByRole('listitem')).toHaveCount(1)

      assertNoConsoleIssues()
    })
  })
})
