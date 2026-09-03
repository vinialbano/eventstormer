import { expect, test, type Page } from '@playwright/test'

/**
 * Core capture-loop smoke (ADR-008): create a workshop, accept scope, narrate three
 * contributions, accept each proposal, and assert three stickies in the backlog.
 * One slim timeline beat (place + sequence) covers the cross-zone macro path; a
 * fourth stage flags two hot spots, resolves one through the facilitator, and
 * walks the in-dock close ceremony to a closed session that survives a reload.
 * Reword, withdraw, and the readable-account walk stay in unit tests. ADR-007
 * no-optimism is in `capture-loop-no-optimism.spec.ts`.
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

  test.describe('hot spots and close', () => {
    test('flags hot spots, resolves one, and closes the session through the ceremony', async () => {
      const backlog = page.getByRole('list', { name: 'Backlog' })
      const hotSpots = page.getByRole('complementary', { name: 'Hot spots' })

      // Flag one hot spot on the remaining backlog event, and one with no target.
      await backlog.getByLabel('event: Member registered').click()
      await page.getByRole('button', { name: 'Flag hot spot' }).click()
      await expect(hotSpots.getByText('Concern: Member registered')).toBeVisible({ timeout: 20_000 })

      await page.getByRole('button', { name: 'Flag a hot spot' }).click()
      await expect(hotSpots.getByRole('status')).toHaveText(/Hot spots\s*2/, { timeout: 20_000 })

      // The facilitator proposes a resolution for the annotated hot spot; accept it.
      await page.getByRole('button', { name: /Facilitator/ }).click()
      const composer = page.getByRole('textbox', { name: 'Describe what happens' })
      await composer.fill('We added a retry so duplicate signups no longer happen.')
      await composer.press('Enter')

      const resolution = page.getByRole('group', { name: 'Resolution' })
      await expect(resolution).toBeVisible({ timeout: 20_000 })
      await resolution.getByRole('button', { name: 'Accept' }).click()
      await expect(hotSpots.getByText(/Resolved — Added a retry/)).toBeVisible({ timeout: 20_000 })

      // Close ceremony: nobody else, then pick the still-open hot spot.
      await page.getByRole('button', { name: 'Close session' }).click()
      await page.getByRole('button', { name: 'Nobody else' }).click()
      await page.getByRole('radio', { name: 'Hot spot' }).click()
      await page.getByRole('button', { name: 'Choose this problem' }).click()
      await page.getByRole('button', { name: 'Close session' }).click()

      await expect(page.getByRole('button', { name: 'Start session' })).toBeVisible({ timeout: 20_000 })

      // The flagged callouts, the resolution, and the count all survive a reload
      // and the session stays closed. The close sweep raises nothing here — the
      // only open question is the scope question, answered by Scope Set — so the
      // count is exactly the two the person flagged.
      await page.reload()
      const hotSpotsAfter = page.getByRole('complementary', { name: 'Hot spots' })
      await expect(hotSpotsAfter.getByRole('status')).toHaveText(/Hot spots\s*2/, { timeout: 20_000 })
      await expect(hotSpotsAfter.getByText(/Concern: Member registered/)).toBeVisible()
      await expect(hotSpotsAfter.getByText(/Resolved — Added a retry/)).toBeVisible()
      await expect(hotSpotsAfter.getByText('Hot spot', { exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Start session' })).toBeVisible()

      assertNoConsoleIssues()
    })
  })
})
