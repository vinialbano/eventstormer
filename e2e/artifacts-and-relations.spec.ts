import { expect, test } from '@playwright/test'

/**
 * Full-pipe scripted-facilitator proof (FREL-01/FREL-02, JSON-01): a real
 * contribution drives the scripted facilitator to emit a `propose-relation`
 * strand; the seam births a model-change `Proposal`; the person accepts it from
 * the dock; the board gains the `follows` edge; and the in-app artifacts panel's
 * model export carries that edge's endpoint ids and the composite version stamp.
 *
 * Scripted facilitator: `FACILITATOR_MODE=scripted` +
 * `e2e/fixtures/facilitator-relations.json`.
 */

const pollFor = async <T>(probe: () => Promise<T | null>, label: string): Promise<T> => {
  const deadline = Date.now() + 20_000
  for (;;) {
    const found = await probe()
    if (found !== null) return found
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`)
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

test('drives a scripted relation proposal into the board and the model export', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000)

  await page.goto('/')
  await page.getByLabel('Your name').fill('Sam')
  await page.getByRole('button', { name: 'Start workshop' }).click()
  await expect(page).toHaveURL(/\/workshops\/[\w-]+$/)
  const workshopId = page.url().split('/').pop() ?? ''

  await page.getByRole('button', { name: 'Start session' }).click()
  await expect(page.getByText('A restaurant kitchen fulfilling dine-in orders.')).toBeVisible({
    timeout: 20_000,
  })
  await page.getByRole('button', { name: 'Accept' }).click()

  const composer = page.getByRole('textbox', { name: 'Describe what happens' })
  const backlog = page.getByRole('list', { name: 'Backlog' })

  for (const [line, label] of [
    ['A waiter puts in a new order.', 'Order placed'],
    ['The line cook finishes the dish.', 'Order cooked'],
  ] as const) {
    await composer.fill(line)
    await composer.press('Enter')
    await page
      .getByRole('group', { name: `Proposal: ${label}` })
      .getByRole('button', { name: 'Accept' })
      .click()
    await expect(backlog.getByLabel(`event: ${label}`)).toBeVisible({ timeout: 20_000 })
  }

  // The contribution that implies the ordering — the scripted facilitator returns
  // a `propose-relation` strand, and the dock renders it as a model-change card.
  await composer.fill('The order is only cooked after it has been placed.')
  await composer.press('Enter')

  const relationCard = page.getByRole('group', {
    name: 'Proposal: sequence: Order placed → Order cooked',
  })
  await expect(relationCard).toBeVisible({ timeout: 20_000 })
  await relationCard.getByRole('button', { name: 'Accept' }).click()

  const board = await pollFor(async () => {
    const snapshot = (await (
      await request.get(`/api/workshops/${workshopId}/board`)
    ).json()) as { follows: { predecessor: string; successor: string }[] }
    return snapshot.follows.length === 1 ? (snapshot.follows[0] ?? null) : null
  }, 'the follows edge on the board')

  // The in-app artifacts panel: open it and read the model export it renders.
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const code = page.locator('pre.artifacts__code')
  await expect(code).toBeVisible({ timeout: 20_000 })
  await expect
    .poll(async () => code.textContent(), { timeout: 20_000 })
    .toContain(`"successor": "${board.successor}"`)

  const shown = (await code.textContent()) ?? ''
  expect(shown).toContain(`"predecessor": "${board.predecessor}"`)
  expect(shown).toContain('"boardPosition"')
  expect(shown).toContain('"sessionRecordPosition"')
  expect(shown).toContain('"renderedAt"')
})
