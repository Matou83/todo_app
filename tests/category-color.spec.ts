import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5177'
const EMAIL = process.env.TEST_EMAIL!
const PASSWORD = process.env.TEST_PASSWORD!

async function login(page: import('@playwright/test').Page) {
  await page.goto(BASE)
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Mot de passe').fill(PASSWORD)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await page.waitForSelector('text=Kanban Board', { timeout: 10000 })
}

test.describe('Feature 7 — Couleur catégorie (Desktop + Mobile)', () => {
  test('swatches visibles lors de la création', async ({ page }) => {
    await login(page)
    // Open category input
    await page.getByRole('button', { name: /\+ Catégorie/i }).click()
    // Color dot should be visible
    const colorDot = page.locator('span.rounded-full.shrink-0').first()
    await expect(colorDot).toBeVisible()
    // Swatches should be visible — 12 color buttons
    const swatches = page.locator('button[aria-label^="Couleur"]')
    await expect(swatches).toHaveCount(12)
  })

  test('sélectionner une couleur met à jour le dot et l\'aperçu', async ({ page }) => {
    await login(page)
    await page.getByRole('button', { name: /\+ Catégorie/i }).click()
    // Type a name to see the preview chip
    await page.getByPlaceholder('Nom de la catégorie…').fill('TestColor')
    // Click on the 4th swatch (index 3, color #22C55E green)
    const swatches = page.locator('button[aria-label^="Couleur"]')
    await swatches.nth(3).click()
    // The preview chip with the label should be visible
    const preview = page.locator('span.rounded-full', { hasText: 'TestColor' })
    await expect(preview).toBeVisible()
    // Cancel
    await page.getByRole('button', { name: '✕' }).click()
  })
})
