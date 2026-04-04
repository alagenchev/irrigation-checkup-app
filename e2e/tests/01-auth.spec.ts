import { test, expect } from '../fixtures/auth'

test.describe('Authentication', () => {
  test('authenticated user sees the inspections page', async ({ page }) => {
    await page.goto('/')
    // Should see the page header or navigation
    await expect(page.locator('h1')).toBeVisible()
    // Should NOT see sign-in
    const signInBtn = page.getByRole('button', { name: /sign in/i })
    const isVisible = await signInBtn.isVisible().catch(() => false)
    expect(isVisible).toBeFalsy()
  })
})
