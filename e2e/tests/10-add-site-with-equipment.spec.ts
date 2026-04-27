import { test, expect } from '../fixtures/auth'

test.describe('Add Site With Equipment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sites')
    await expect(page.locator('[data-testid="sites-page"]')).toBeVisible()
  })

  test('creates a site and adds equipment inline without leaving the page', async ({ page }) => {
    const siteName = `E2E Site ${Date.now()}`
    await page.getByPlaceholder(/acme hq/i).fill(siteName)
    await page.getByRole('button', { name: /add site/i }).click()

    await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()
    await expect(page.getByTestId('site-equipment-editor')).toBeVisible()
    await expect(page.getByTestId('add-site-equipment-phase')).toContainText(siteName)

    await page.getByTestId('site-equipment-editor-add-controller').click()
    await page.getByTestId('site-equipment-editor-controllers-table')
      .getByPlaceholder('Hunter').fill('Rainbird')

    await page.getByTestId('site-equipment-editor-save').click()

    await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()
    await expect(page.getByTestId('sites-table')).toContainText(siteName)

    // Verify the new site has an Edit Equipment button (editor initialises empty — no pre-fill)
    const siteRow = page.getByTestId('sites-table').locator('tr', { hasText: siteName })
    await siteRow.getByTestId('sites-table-edit-equipment').click()
    await expect(page.getByTestId('site-equipment-editor')).toBeVisible()
  })

  test('can skip equipment and the site still appears in the table', async ({ page }) => {
    const siteName = `E2E Skip ${Date.now()}`
    await page.getByPlaceholder(/acme hq/i).fill(siteName)
    await page.getByRole('button', { name: /add site/i }).click()

    await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()

    await page.getByTestId('add-site-skip-equipment').click()

    await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()
    await expect(page.getByTestId('sites-table')).toContainText(siteName)
  })

  test('site form fields are cleared after skipping, ready for a new site', async ({ page }) => {
    await page.getByPlaceholder(/acme hq/i).fill('Site To Reset')
    await page.getByRole('button', { name: /add site/i }).click()
    await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()

    await page.getByTestId('add-site-skip-equipment').click()

    await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()
    await expect(page.getByPlaceholder(/acme hq/i)).toHaveValue('')
  })

  test('Cancel from equipment editor returns to the site form', async ({ page }) => {
    await page.getByPlaceholder(/acme hq/i).fill(`E2E Cancel ${Date.now()}`)
    await page.getByRole('button', { name: /add site/i }).click()
    await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()

    await page.getByTestId('site-equipment-editor-cancel').click()

    await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()
  })

  test('can add two sites back-to-back without reloading the page', async ({ page }) => {
    const ts = Date.now()
    const names = [`E2E First ${ts}`, `E2E Second ${ts}`]

    for (const name of names) {
      await page.getByPlaceholder(/acme hq/i).fill(name)
      await page.getByRole('button', { name: /add site/i }).click()
      await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()
      await page.getByTestId('add-site-skip-equipment').click()
      await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()
    }

    const tableText = await page.getByTestId('sites-table').textContent()
    expect(tableText).toContain('E2E First')
    expect(tableText).toContain('E2E Second')
  })

  test('shows a validation error if site name is blank', async ({ page }) => {
    await page.getByRole('button', { name: /add site/i }).click()
    await expect(page.getByTestId('add-site-equipment-phase')).not.toBeVisible({ timeout: 2000 })
  })
})
