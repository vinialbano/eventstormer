import { expect, test } from '@playwright/test'

/**
 * The one end-to-end flow (spec Success Criteria): a person creates a
 * workshop, accepts the scripted facilitator's scope card, narrates three
 * contributions, accepts each proposed building block, and sees all three land
 * in the board backlog. Then they open the readable-account drawer, reword
 * one sticky through the confirm popover (quoted evidence keeps the old
 * spelling), withdraw that sticky, and reinstate it. The facilitator is the
 * `FACILITATOR_MODE=scripted` double reading `e2e/fixtures/facilitator.json`
 * (wired in playwright.config.ts); everything else is the real server, real
 * SQLite, real SPA.
 */
test('create → scope → accept → reword → withdraw → reinstate', async ({ page }) => {
  test.setTimeout(90_000)
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
  for (const label of [originalLabel, 'Book returned', 'Member registered']) {
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
  await expect(reworded).toHaveAttribute('data-withdrawn', 'true')
  await reworded.click()
  await page.getByRole('button', { name: 'Reinstate' }).click()
  await expect(reworded).toHaveAttribute('data-withdrawn', 'false')
  await expect(backlog.getByLabel(`event: ${rewordedLabel}`)).toHaveCount(1)
})
