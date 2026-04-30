import { test, expect } from '../fixtures/auth'

test.describe('New Site Drawable Map Phase', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sites')
    await expect(page.locator('[data-testid="sites-page"]')).toBeVisible()
  })

  test('create site → skip equipment → map phase appears → skip map → blank form', async ({ page }) => {
    const siteName = `E2E Map Skip ${Date.now()}`

    await page.getByPlaceholder(/acme hq/i).fill(siteName)
    await page.getByRole('button', { name: /add site/i }).click()

    // Equipment phase must appear first
    await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()

    // Skip equipment → map phase
    await page.getByTestId('add-site-skip-equipment').click()

    // Map phase should now be visible with the skip button
    await expect(page.getByTestId('add-site-map-phase')).toBeVisible()
    await expect(page.getByTestId('add-site-skip-map')).toBeVisible()

    // Skip map → back to blank Add Site form
    await page.getByTestId('add-site-skip-map').click()

    await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()
    await expect(page.getByPlaceholder(/acme hq/i)).toHaveValue('')
  })

  test('map phase description contains the correct site name', async ({ page }) => {
    const siteName = `E2E Map Name ${Date.now()}`

    await page.getByPlaceholder(/acme hq/i).fill(siteName)
    await page.getByRole('button', { name: /add site/i }).click()

    await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()
    await page.getByTestId('add-site-skip-equipment').click()

    await expect(page.getByTestId('add-site-map-phase')).toBeVisible()

    // The description paragraph should mention the site name
    await expect(page.getByTestId('add-site-map-phase')).toContainText(siteName)
  })

  test('map phase: Mapbox canvas loads', async ({ page }) => {
    const siteName = `E2E Map Canvas ${Date.now()}`

    await page.getByPlaceholder(/acme hq/i).fill(siteName)
    await page.getByRole('button', { name: /add site/i }).click()

    await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()
    await page.getByTestId('add-site-skip-equipment').click()

    await expect(page.getByTestId('add-site-map-phase')).toBeVisible()

    // Wait for the Mapbox canvas to be rendered inside the map container
    const canvas = page.locator('[data-testid="site-map-container"] canvas')
    await expect(canvas).toBeVisible({ timeout: 10000 })
  })

  test('create site → save equipment → map phase appears → skip map → site in table', async ({ page }) => {
    const siteName = `E2E Map SaveEquip ${Date.now()}`

    await page.getByPlaceholder(/acme hq/i).fill(siteName)
    await page.getByRole('button', { name: /add site/i }).click()

    // Equipment phase
    await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()

    // Save equipment without any changes
    await page.getByTestId('site-equipment-editor-save').click()

    // Map phase should appear after saving equipment
    await expect(page.getByTestId('add-site-map-phase')).toBeVisible()

    // Skip map
    await page.getByTestId('add-site-skip-map').click()

    // Back to form, and site should be in the table
    await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()
    await expect(page.getByTestId('sites-table')).toContainText(siteName)
  })

  test('regression: equipment phase still appears after site creation', async ({ page }) => {
    const siteName = `E2E Regress Equip ${Date.now()}`

    await page.getByPlaceholder(/acme hq/i).fill(siteName)
    await page.getByRole('button', { name: /add site/i }).click()

    // Equipment phase and editor must be visible
    await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()
    await expect(page.getByTestId('site-equipment-editor')).toBeVisible()

    // Skip equipment button must also be present
    await expect(page.getByTestId('add-site-skip-equipment')).toBeVisible()
  })

  test('back-to-back sites each flow through skip-equipment → map phase → skip-map → appear in table', async ({ page }) => {
    const ts = Date.now()
    const names = [`E2E BB First ${ts}`, `E2E BB Second ${ts}`]

    for (const name of names) {
      await page.getByPlaceholder(/acme hq/i).fill(name)
      await page.getByRole('button', { name: /add site/i }).click()

      await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()
      await page.getByTestId('add-site-skip-equipment').click()

      await expect(page.getByTestId('add-site-map-phase')).toBeVisible()
      await page.getByTestId('add-site-skip-map').click()

      await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()
    }

    const tableText = await page.getByTestId('sites-table').textContent()
    expect(tableText).toContain(`E2E BB First ${ts}`)
    expect(tableText).toContain(`E2E BB Second ${ts}`)
  })
})
