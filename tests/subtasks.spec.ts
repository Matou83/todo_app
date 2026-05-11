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

async function openFirstTask(page: import('@playwright/test').Page) {
  const card = page.locator('.animate-scale-in').first()
  await card.click()
  await page.waitForSelector('text=Modifier la tâche', { timeout: 5000 })
}

const dialog = (page: import('@playwright/test').Page) => page.locator('[role="dialog"]')

test.describe('Feature 8 — Sous-tâches (Desktop + Mobile)', () => {
  test('section sous-tâches visible dans le modal', async ({ page }) => {
    await login(page)
    await openFirstTask(page)
    await expect(dialog(page).getByText('Sous-tâches').first()).toBeVisible()
    await expect(dialog(page).getByPlaceholder('Ajouter une sous-tâche…')).toBeVisible()
  })

  test('ajouter une sous-tâche et la voir dans la liste', async ({ page }) => {
    await login(page)
    await openFirstTask(page)

    await dialog(page).getByPlaceholder('Ajouter une sous-tâche…').fill('Test sous-tâche')
    await dialog(page).getByRole('button', { name: 'Ajouter', exact: true }).click()

    await expect(dialog(page).getByText('Test sous-tâche').first()).toBeVisible()
    // Progress bar should appear
    await expect(dialog(page).locator('.h-1\\.5.bg-slate-100')).toBeVisible()

    // Clean up: delete the subtask
    await dialog(page).locator('button[aria-label="Supprimer la sous-tâche"]').last().click()
    await page.keyboard.press('Escape')
  })

  test('cocher une sous-tâche met à jour le badge', async ({ page }) => {
    await login(page)
    await openFirstTask(page)

    // Add a subtask
    await dialog(page).getByPlaceholder('Ajouter une sous-tâche…').fill('Sous-tâche à cocher')
    await dialog(page).getByRole('button', { name: 'Ajouter', exact: true }).click()

    // Check the subtask
    await dialog(page).locator('button[aria-label="Marquer terminée"]').last().click()
    await expect(dialog(page).locator('button[aria-label="Marquer non terminée"]').first()).toBeVisible()

    // Clean up
    await dialog(page).locator('button[aria-label="Supprimer la sous-tâche"]').last().click()
    await page.keyboard.press('Escape')
  })

  test('badge visible sur la card si sous-tâches présentes', async ({ page }) => {
    await login(page)
    await openFirstTask(page)

    // Add a subtask
    await dialog(page).getByPlaceholder('Ajouter une sous-tâche…').fill('Sous-tâche card test')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    // Close modal
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Badge should be visible on the card
    await expect(page.locator('.animate-scale-in').first().locator('text=/\\d+\\/\\d+ sous/')).toBeVisible()

    // Clean up: reopen and delete
    await page.locator('.animate-scale-in').first().click()
    await page.waitForSelector('text=Modifier la tâche', { timeout: 5000 })
    await dialog(page).locator('button[aria-label="Supprimer la sous-tâche"]').last().click()
    await page.keyboard.press('Escape')
  })
})
