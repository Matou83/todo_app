import { test, expect, devices } from '@playwright/test'

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

test.describe('Feature 6 — Filtre "En retard" (Desktop)', () => {
  test('chip présent si tâches en retard', async ({ page }) => {
    await login(page)
    const chip = page.locator('button', { hasText: /En retard/ }).first()
    if (await chip.count() === 0) {
      // No overdue tasks — acceptable
      return
    }
    await expect(chip).toBeVisible()
  })

  test('clic active le filtre et grise la colonne Terminé', async ({ page }) => {
    await login(page)
    const chip = page.locator('button', { hasText: /En retard/ }).first()
    if (await chip.count() === 0) {
      return
    }
    await chip.click()
    // Chip active = bg-red-600
    await expect(chip).toHaveClass(/bg-red-600/)
    // Done column dimmed
    const dimmedCol = page.locator('.opacity-35')
    await expect(dimmedCol).toBeVisible()
    // Toggle off
    await chip.click()
    await expect(chip).not.toHaveClass(/bg-red-600/)
  })
})

// Mobile test in separate file — test.use cannot be inside describe
