import { expect, test } from '@playwright/test'

/**
 * The one end-to-end flow (spec Success Criteria): a person creates a
 * workshop, accepts the scripted facilitator's scope card, narrates three
 * contributions, accepts each proposed building block, and sees all three land
 * in the board backlog. Then they open the readable-account drawer, reword
 * one sticky through the confirm popover (quoted evidence keeps the old
 * spelling), withdraw that sticky, reveal withdrawn ghosts, and reinstate it.
 * After that they place and sequence two events onto the timeline, reword one
 * sequenced name through confirm (a follows site is listed), and the account
 * walks those events in follows order while the quoted contribution stays
 * unchanged. The facilitator is the `FACILITATOR_MODE=scripted` double reading
 * `e2e/fixtures/facilitator.json` (wired in playwright.config.ts); everything
 * else is the real server, real SQLite, real SPA.
 */
test('create → scope → accept → reword → withdraw → reinstate → place → sequence', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.goto('/')

  await page.getByLabel('Your name').fill('Maria')
  await page.getByRole('button', { name: 'Start workshop' }).click()
  await expect(page).toHaveURL(/\/workshops\/[\w-]+$/)

  await page.getByRole('button', { name: 'Start session' }).click()

  const scopeStatement = 'A public library that lends books to registered members.'
  await expect(page.getByText(scopeStatement)).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/What business are we mapping/)).toBeVisible()
  await page.getByRole('button', { name: 'Accept' }).click()
  await expect(page.getByText(scopeStatement)).toBeHidden()
  await expect(page.getByText('describe the first thing that happens')).toBeVisible()

  const composer = page.getByRole('textbox', { name: 'Describe what happens' })
  const originalLabel = 'Book borrowed'
  const rewordedLabel = 'Volume checked out'
  const sequencedLabel = 'Book returned'
  const sequencedReword = 'Title returned'
  const narration = [
    'Book borrowed when a member takes a book from the library.',
    'The member brings the book back to the desk.',
    'Someone new signs up for a membership.',
  ]
  for (const line of narration) {
    await composer.fill(line)
    await composer.press('Enter')
    await expect(composer).toHaveValue('')
  }

  const backlog = page.getByRole('list', { name: 'Backlog' })
  for (const label of [originalLabel, sequencedLabel, 'Member registered']) {
    const proposal = page.getByText(label, { exact: true })
    await expect(proposal).toBeVisible({ timeout: 20_000 })
    await proposal.locator('..').getByRole('button', { name: 'Accept' }).click()
    await expect(backlog.getByLabel(`event: ${label}`)).toBeVisible({ timeout: 20_000 })
  }

  await expect(backlog.getByRole('listitem')).toHaveCount(3)

  await page.getByRole('button', { name: 'Readable account' }).click()
  await expect(page.getByText(`Event: ${originalLabel}`)).toBeVisible()
  await expect(page.getByRole('blockquote')).toContainText(originalLabel)

  const originalSticky = backlog.getByLabel(`event: ${originalLabel}`)
  await originalSticky.click()
  await page.getByRole('button', { name: 'Reword' }).click()
  const draft = page.getByRole('textbox', { name: 'Reword label' })
  await draft.fill(rewordedLabel)
  await draft.press('Enter')
  await page.getByRole('button', { name: 'Confirm reword' }).click()

  const reworded = backlog.getByLabel(`event: ${rewordedLabel}`)
  await expect(reworded).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('blockquote')).toContainText(originalLabel)
  await expect(page.getByText(`Event: ${rewordedLabel}`)).toBeVisible()
  await expect(page.getByText(`Event: ${originalLabel}`)).toHaveCount(0)

  await reworded.click()
  await page.getByRole('button', { name: 'Withdraw' }).click()
  await page.getByRole('button', { name: 'Confirm withdraw' }).click()
  await page.getByRole('button', { name: 'Collapse the dock' }).click()
  await page.getByRole('checkbox', { name: 'Show withdrawn' }).check()
  await expect(reworded).toHaveAttribute('data-withdrawn', 'true')
  await reworded.click()
  await page.getByRole('button', { name: 'Reinstate' }).click()
  await expect(reworded).toHaveAttribute('data-withdrawn', 'false')
  await expect(backlog.getByLabel(`event: ${rewordedLabel}`)).toHaveCount(1)

  await page.getByRole('button', { name: 'Readable account' }).click()
  await reworded.click()
  await page.getByRole('button', { name: 'Place on timeline' }).click()
  const timeline = page.getByRole('region', { name: 'Timeline' })
  await expect(timeline.getByText(rewordedLabel, { exact: true })).toBeVisible({ timeout: 20_000 })
  await expect(backlog.getByLabel(`event: ${rewordedLabel}`)).toHaveCount(0)

  await backlog.getByLabel(`event: ${sequencedLabel}`).click()
  await page.getByRole('button', { name: 'Sequence after' }).click()
  await expect(timeline.getByText(sequencedLabel, { exact: true })).toBeVisible({ timeout: 20_000 })
  await expect(backlog.getByLabel(`event: ${sequencedLabel}`)).toHaveCount(0)
  await expect(backlog.getByRole('listitem')).toHaveCount(1)

  await timeline.getByText(sequencedLabel, { exact: true }).click()
  await page.getByRole('button', { name: 'Reword' }).click()
  const timelineDraft = page.getByRole('textbox', { name: 'Reword label' })
  await timelineDraft.fill(sequencedReword)
  await timelineDraft.press('Enter')
  const impact = page.getByRole('dialog', { name: 'Reword impact' })
  await expect(impact.getByRole('listitem')).toHaveCount(2)
  await expect(impact).toContainText('Readable account · Building blocks')
  await expect(impact).toContainText('>')
  await page.getByRole('button', { name: 'Confirm reword' }).click()

  await expect(timeline.getByText(sequencedReword, { exact: true })).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Readable account' }).click()
  await expect(page.getByRole('blockquote')).toContainText(originalLabel)
  await expect(page.getByRole('heading', { name: 'Timeline and relations' })).toBeVisible()
  await expect(page.getByText('Timeline and relations: not run')).toHaveCount(0)
  const walk = page.getByRole('heading', { name: 'Timeline and relations' }).locator('+ ul')
  await expect(walk).toContainText(`Event: ${rewordedLabel}`)
  await expect(walk).toContainText(`Event: ${sequencedReword}`)
  const walkText = await walk.innerText()
  expect(walkText.indexOf(rewordedLabel)).toBeLessThan(walkText.indexOf(sequencedReword))
})
