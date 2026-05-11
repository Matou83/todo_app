import { test, expect } from '@playwright/test'

const EMAIL = process.env.TEST_EMAIL ?? ''
const PASSWORD = process.env.TEST_PASSWORD ?? ''

async function login(page: any) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const emailInput = page.locator('input[type="email"]')
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill(EMAIL)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
  }
}

// Deletes the first visible task card and returns its title
async function deleteFirstCard(page: any): Promise<string> {
  const firstCard = page.locator('.group').first()
  await expect(firstCard).toBeVisible({ timeout: 5000 })
  const title = await firstCard.locator('p').first().innerText()

  // Hover to reveal menu button (desktop), then click
  await firstCard.hover()
  await page.waitForTimeout(150)
  const menuBtn = firstCard.locator('button[aria-label="Options de la tâche"]')
  await menuBtn.click()
  await page.waitForTimeout(300)

  await page.locator('button:has-text("Supprimer")').last().click()
  await page.waitForTimeout(300)
  return title
}

test.describe('Undo delete — desktop', () => {
  test('snackbar apparaît et undo restaure la tâche', async ({ page }) => {
    await login(page)

    // Delete first task
    const title = await deleteFirstCard(page)

    // Snackbar should appear
    const snackbar = page.locator('[data-testid="undo-snackbar"]')
    await expect(snackbar).toBeVisible({ timeout: 3000 })
    await expect(snackbar.locator('button:has-text("Annuler")')).toBeVisible()
    await page.screenshot({ path: 'test-results/undo-01-desktop-snackbar.png' })

    // Click undo — task should be restored
    await snackbar.locator('button:has-text("Annuler")').click()
    await page.waitForTimeout(500)
    await expect(page.locator('.group').filter({ hasText: title }).first()).toBeVisible()
    await page.screenshot({ path: 'test-results/undo-02-desktop-restored.png' })
  })
})

test.describe('Undo delete — mobile', () => {
  test('snackbar visible et dans l\'écran, undo restaure', async ({ page }) => {
    await login(page)

    // Delete first card on current tab
    const title = await deleteFirstCard(page)

    // Snackbar should appear
    const snackbar = page.locator('[data-testid="undo-snackbar"]')
    await expect(snackbar).toBeVisible({ timeout: 3000 })
    await page.screenshot({ path: 'test-results/undo-03-mobile-snackbar.png' })

    // Fully within viewport
    const box = await snackbar.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1)

    // Undo
    await snackbar.locator('button:has-text("Annuler")').click()
    await page.waitForTimeout(500)
    await expect(page.locator('.group').filter({ hasText: title }).first()).toBeVisible()
    await page.screenshot({ path: 'test-results/undo-04-mobile-restored.png' })
  })
})
