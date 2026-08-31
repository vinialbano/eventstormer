import { expect, test } from '@playwright/test'

/**
 * The one end-to-end flow (spec Success Criteria): a person creates a
 * workshop, accepts the scripted facilitator's scope card, narrates three
 * contributions, accepts each proposed building block, and sees all three land
 * in the board backlog. The facilitator is the `FACILITATOR_MODE=scripted`
 * double reading `e2e/fixtures/facilitator.json` (wired in playwright.config.ts);
 * everything else is the real server, real SQLite, real SPA.
 */
test('create → scope → 3 contributions → accept → building blocks in the backlog', async ({ page }) => {
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
  const narration = [
    'A member borrows a book from the library.',
    'The member brings the book back to the desk.',
    'Someone new signs up for a membership.',
  ]
  for (const line of narration) {
    await composer.fill(line)
    await composer.press('Enter')
    await expect(composer).toHaveValue('')
  }

  const backlog = page.getByRole('list', { name: 'Backlog' })
  for (const label of ['Book borrowed', 'Book returned', 'Member registered']) {
    const proposal = page.getByText(label, { exact: true })
    await expect(proposal).toBeVisible({ timeout: 20_000 })
    await proposal.locator('..').getByRole('button', { name: 'Accept' }).click()
    await expect(backlog.getByLabel(`event: ${label}`)).toBeVisible({ timeout: 20_000 })
  }

  await expect(backlog.getByRole('listitem')).toHaveCount(3)
})
