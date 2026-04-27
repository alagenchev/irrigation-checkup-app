import { Page } from '@playwright/test'

/**
 * Fill in the minimum required fields for a valid inspection save.
 */
export async function fillMinimalInspection(page: Page, siteName: string) {
  // Switch to new-site mode, then fill the new site name field
  await page.getByRole('button', { name: /new site/i }).click()
  await page.locator('[data-testid="site-selector-new-name"]').fill(siteName)
}

/**
 * Navigate to home and ensure form is visible.
 */
export async function goToNewInspection(page: Page) {
  await page.goto('/')
  // Form is on the home page
}

/**
 * Get today's date in YYYY-MM-DD format.
 */
export function todayISO(): string {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}
