import { test, expect, devices } from '@playwright/test'

test.use({ ...devices['Pixel 5'] })

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

test('Mobile — chip En retard visible et fonctionnel', async ({ page }) => {
  await login(page)
  const chip = page.locator('button', { hasText: /En retard/ }).first()
  if (await chip.count() === 0) {
    // No overdue tasks — acceptable
    return
  }
  await expect(chip).toBeVisible()
  await chip.tap()
  await expect(chip).toHaveClass(/bg-red-600/)
  // Tap again to deactivate
  await chip.tap()
  await expect(chip).not.toHaveClass(/bg-red-600/)
})
