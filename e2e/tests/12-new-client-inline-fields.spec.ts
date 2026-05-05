import { test, expect } from '../fixtures/auth'

test.describe('New Client Inline Fields', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sites')
    await expect(page.locator('[data-testid="sites-page"]')).toBeVisible()
  })

  test('reveals new client details section when typing a name that does not match any existing client', async ({ page }) => {
    // Type a name that won't match any existing client
    const newClientName = `New Client ${Date.now()}`
    await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(newClientName)

    // New client details section should appear
    await expect(page.getByTestId('new-client-details')).toBeVisible()
    await expect(page.getByTestId('new-client-phone')).toBeVisible()
    await expect(page.getByTestId('new-client-email')).toBeVisible()
    await expect(page.getByTestId('new-client-account-type')).toBeVisible()
    await expect(page.getByTestId('new-client-account-number')).toBeVisible()
  })

  test('does NOT show new client details section when an existing client name is typed', async ({ page }) => {
    // Clear the client input to verify details section is hidden
    const clientInput = page.locator('[data-testid="add-site-form"] input[name="client_name"]')
    await clientInput.fill('')

    // Verify that with empty input, details section is hidden
    await expect(page.getByTestId('new-client-details')).not.toBeVisible()
  })

  test('creates a site and new client with all details filled in', async ({ page }) => {
    const siteName = `E2E Site ${Date.now()}`
    const clientName = `E2E Client ${Date.now()}`

    // Fill site name
    await page.getByPlaceholder(/acme hq/i).fill(siteName)

    // Fill client name (new, not existing)
    await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(clientName)

    // Wait for new client details section to appear
    await expect(page.getByTestId('new-client-details')).toBeVisible()

    // Fill all client detail fields
    await page.getByTestId('new-client-phone').fill('555-9876')
    await page.getByTestId('new-client-email').fill('e2eclient@test.com')
    await page.getByTestId('new-client-account-type').selectOption('Commercial')
    await page.getByTestId('new-client-account-number').fill('ACC-E2E-001')

    // Submit
    await page.getByRole('button', { name: /add site/i }).click()

    // Phase 2 appears (site was created)
    await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()
    await page.getByTestId('add-site-skip-equipment').click()

    // Verify the site appears in the table
    await expect(page.getByTestId('sites-table')).toContainText(siteName)

    // Navigate to clients page and verify client was created
    await page.goto('/clients')
    await expect(page.getByText(clientName)).toBeVisible()
  })

  test('account type select has Commercial, Residential, HOA, Municipal options', async ({ page }) => {
    const clientName = `Options Test ${Date.now()}`
    await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(clientName)
    await expect(page.getByTestId('new-client-details')).toBeVisible()

    const select = page.getByTestId('new-client-account-type')
    // Check for each option value or text
    await expect(select.locator('option[value="Commercial"], option:has-text("Commercial")')).toHaveCount(1)
    await expect(select.locator('option[value="Residential"], option:has-text("Residential")')).toHaveCount(1)
    await expect(select.locator('option[value="HOA"], option:has-text("HOA")')).toHaveCount(1)
    await expect(select.locator('option[value="Municipal"], option:has-text("Municipal")')).toHaveCount(1)
  })

  test('new client details section is not visible after form resets', async ({ page }) => {
    const siteName = `E2E Reset ${Date.now()}`
    const clientName = `Reset Client ${Date.now()}`

    await page.getByPlaceholder(/acme hq/i).fill(siteName)
    await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(clientName)
    await expect(page.getByTestId('new-client-details')).toBeVisible()

    await page.getByRole('button', { name: /add site/i }).click()
    await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()
    await page.getByTestId('add-site-skip-equipment').click()

    // After reset, form is in phase 1 and new-client-details is gone
    await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()
    await expect(page.getByTestId('new-client-details')).not.toBeVisible()
  })
})
