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

  // The scripted opening scope question arrives as an F05 accept/edit/reject card.
  const scopeCard = page.locator('.dock__scope')
  await expect(scopeCard).toBeVisible({ timeout: 20_000 })
  await expect(
    scopeCard.getByText('A public library that lends books to registered members.'),
  ).toBeVisible()
  await scopeCard.getByRole('button', { name: 'Accept' }).click()
  await expect(scopeCard).toBeHidden()

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
    const card = page.locator('.pc--active', { hasText: label })
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.getByRole('button', { name: 'Accept' }).click()
    await expect(backlog.getByText(label, { exact: true })).toBeVisible({ timeout: 20_000 })
  }

  await expect(page.locator('.wall__backlog .sticky')).toHaveCount(3)
})
