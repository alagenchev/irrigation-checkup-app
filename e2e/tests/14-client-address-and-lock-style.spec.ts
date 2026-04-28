import { test, expect } from '../fixtures/auth'

// client-address-and-lock-style (b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e)

test.describe('Client address checkbox — add-site form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sites')
    await expect(page.locator('[data-testid="sites-page"]')).toBeVisible()
  })

  test('checkbox and label appear when new client name is typed', async ({ page }) => {
    await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(`New Client ${Date.now()}`)
    await expect(page.getByTestId('new-client-address-same-checkbox')).toBeVisible()
    await expect(page.getByTestId('new-client-address-same-checkbox-label')).toBeVisible()
  })

  test('checkbox is checked by default and disabled address display is shown', async ({ page }) => {
    await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(`New Client ${Date.now()}`)
    await expect(page.getByTestId('new-client-address-same-checkbox')).toBeChecked()
    await expect(page.getByTestId('new-client-address-display')).toBeVisible()
    await expect(page.getByTestId('new-client-address-display')).toBeDisabled()
  })

  test('site address mirrors into disabled client address display', async ({ page }) => {
    // Fill site address
    await page.locator('[data-testid="add-site-form"] input[name="address"]').fill('123 Mirror St')
    // Enter new client name
    await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(`New Client ${Date.now()}`)
    // Client address display should show the site address
    await expect(page.getByTestId('new-client-address-display')).toHaveValue('123 Mirror St')
  })

  test('unchecking shows address autocomplete and hides display', async ({ page }) => {
    await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(`New Client ${Date.now()}`)
    await page.getByTestId('new-client-address-same-checkbox').uncheck()
    await expect(page.getByTestId('new-client-address-input')).toBeVisible()
    await expect(page.getByTestId('new-client-address-display')).not.toBeVisible()
  })

  test('re-checking restores disabled display and hides autocomplete', async ({ page }) => {
    await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(`New Client ${Date.now()}`)
    await page.getByTestId('new-client-address-same-checkbox').uncheck()
    await expect(page.getByTestId('new-client-address-input')).toBeVisible()
    await page.getByTestId('new-client-address-same-checkbox').check()
    await expect(page.getByTestId('new-client-address-display')).toBeVisible()
    await expect(page.getByTestId('new-client-address-input')).not.toBeVisible()
  })
})

test.describe('Locked client field styling — irrigation form', () => {
  test('locked client name field has grey background, not faded text', async ({ page }) => {
    await page.goto('/')

    // Open the site selector dropdown
    const siteInput = page.locator('[data-testid="site-selector"] input[name="siteName"]')
    await siteInput.click()

    // Pick the first site from the dropdown
    const firstOption = page.locator('[role="listbox"] li').first()
    await firstOption.waitFor({ state: 'visible', timeout: 5000 })
    await firstOption.click()

    // If a locked client name field appears, check its background colour
    const lockedName = page.getByTestId('client-name-locked')
    if (await lockedName.isVisible()) {
      const bg = await lockedName.evaluate(el => getComputedStyle(el).backgroundColor)
      // Expect dark grey: rgb(44, 44, 46)
      expect(bg).toMatch(/rgb\(44,\s*44,\s*46\)/)
    }
  })
})
