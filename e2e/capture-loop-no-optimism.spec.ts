import { expect, test } from '@playwright/test'

/**
 * ADR-007 macro guard: accepting a proposal must not place a sticky on the board
 * until the server-confirmed board GET completes. Uses `page.route()` to hold the
 * refetch while the UI shows the in-flight "Adding…" state.
 */
test('does not show an accepted block on the board before the refetch lands', async ({ page }) => {
  test.setTimeout(120_000)

  const scopeStatement = 'A public library that lends books to registered members.'
  const label = 'Book borrowed'
  const narration = 'Book borrowed when a member takes a book from the library.'

  let holdBoardRefetch = false
  let releaseBoardRefetch: (() => void) | undefined

  await page.route(/\/api\/workshops\/[^/]+\/board$/, async (route) => {
    if (holdBoardRefetch) {
      await new Promise<void>((resolve) => {
        releaseBoardRefetch = () => {
          resolve()
        }
      })
    }
    await route.continue()
  })

  await page.goto('/')

  await page.getByLabel('Your name').fill('Maria')
  await page.getByRole('button', { name: 'Start workshop' }).click()
  await expect(page).toHaveURL(/\/workshops\/[\w-]+$/)

  await page.getByRole('button', { name: 'Start session' }).click()
  await expect(page.getByText(scopeStatement)).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Accept' }).click()
  await expect(page.getByText('describe the first thing that happens')).toBeVisible({
    timeout: 20_000,
  })

  const composer = page.getByRole('textbox', { name: 'Describe what happens' })
  await composer.fill(narration)
  await composer.press('Enter')
  await expect(page.getByRole('group', { name: `Proposal: ${label}` })).toBeVisible({
    timeout: 20_000,
  })

  const backlog = page.getByRole('list', { name: 'Backlog' })
  await expect(backlog.getByLabel(`event: ${label}`)).toHaveCount(0)

  holdBoardRefetch = true
  const proposal = page.getByRole('group', { name: `Proposal: ${label}` })
  await proposal.getByRole('button', { name: 'Accept' }).click()

  await expect(backlog.getByLabel(`event: ${label}`)).toHaveCount(0)
  await expect(
    proposal
      .getByText('Adding…')
      .or(proposal.getByRole('button', { name: 'Accept' }))
      .or(page.getByRole('status').filter({ hasText: label })),
  ).toBeVisible({ timeout: 20_000 })

  holdBoardRefetch = false
  releaseBoardRefetch?.()

  await expect(backlog.getByLabel(`event: ${label}`)).toBeVisible({ timeout: 20_000 })
})
