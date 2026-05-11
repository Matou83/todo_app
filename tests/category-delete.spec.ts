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

async function createCategory(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: /\+ Catégorie/i }).click()
  await page.getByPlaceholder('Nom de la catégorie…').fill(name)
  await page.getByRole('button', { name: 'Créer', exact: true }).click()
  await page.waitForTimeout(500)
}

test.describe('Supprimer une catégorie (Desktop + Mobile)', () => {
  test('bouton supprimer visible au hover sur catégorie custom', async ({ page }) => {
    await login(page)
    const catName = `TestDel-${Date.now()}`
    await createCategory(page, catName)

    // Find the chip (scroll into view first — FilterBar is horizontally scrollable on mobile)
    const chip = page.locator('div.group\\/cat').filter({ hasText: catName })
    await chip.scrollIntoViewIfNeeded()
    await chip.hover()

    // Trash button should appear
    const deleteBtn = chip.locator('button[aria-label^="Supprimer"]')
    await expect(deleteBtn).toBeVisible()
  })

  test('clic sur supprimer affiche la confirmation inline', async ({ page }) => {
    await login(page)
    const catName = `TestConfirm-${Date.now()}`
    await createCategory(page, catName)

    const chip = page.locator('div.group\\/cat').filter({ hasText: catName })
    await chip.hover()
    await chip.locator('button[aria-label^="Supprimer"]').click()

    // Confirm UI should appear
    await expect(page.getByText('Supprimer ?')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Oui' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Non' })).toBeVisible()
  })

  test('annuler la suppression (Non) restaure le chip', async ({ page }) => {
    await login(page)
    const catName = `TestCancel-${Date.now()}`
    await createCategory(page, catName)

    const chip = page.locator('div.group\\/cat').filter({ hasText: catName })
    await chip.hover()
    await chip.locator('button[aria-label^="Supprimer"]').click()
    await page.getByRole('button', { name: 'Non' }).click()

    // Chip should be back
    await expect(page.locator('div.group\\/cat').filter({ hasText: catName })).toBeVisible()
  })

  test('confirmer la suppression retire la catégorie', async ({ page }) => {
    await login(page)
    const catName = `TestDelete-${Date.now()}`
    await createCategory(page, catName)

    const chip = page.locator('div.group\\/cat').filter({ hasText: catName })
    await chip.hover()
    await chip.locator('button[aria-label^="Supprimer"]').click()
    await page.getByRole('button', { name: 'Oui' }).click()
    await page.waitForTimeout(500)

    // Category should be gone
    await expect(page.locator('div.group\\/cat').filter({ hasText: catName })).toHaveCount(0)
  })

  test('catégories par défaut (Ops, IA…) n\'ont pas de bouton supprimer', async ({ page }) => {
    await login(page)
    const opsChip = page.locator('div.group\\/cat').filter({ hasText: 'Ops' })
    await opsChip.hover()
    await expect(opsChip.locator('button[aria-label^="Supprimer"]')).toHaveCount(0)
  })
})
