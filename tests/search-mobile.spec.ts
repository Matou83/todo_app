import { test } from '@playwright/test'

const EMAIL = process.env.TEST_EMAIL ?? 'mathieu.legallic@icloud.com'
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

test('mobile: header closed', async ({ page }) => {
  await login(page)
  await page.screenshot({ path: 'test-results/01-header-closed.png' })
  await page.locator('header').screenshot({ path: 'test-results/02-header-zoom.png' })
})

test('mobile: header with search open', async ({ page }) => {
  await login(page)
  const searchBtn = page.locator('button[aria-label="Rechercher"]')
  const found = await searchBtn.isVisible({ timeout: 3000 }).catch(() => false)
  if (found) {
    await searchBtn.click()
    await page.waitForTimeout(400)
  }
  await page.screenshot({ path: 'test-results/03-search-open.png' })
  await page.locator('header').screenshot({ path: 'test-results/04-header-search-open.png' })
})
