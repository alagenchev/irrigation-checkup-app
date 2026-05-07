import { test, expect } from '../fixtures/auth'

// ---------------------------------------------------------------------------
// MapsListPanel — clicking Map now opens a maps list, not the editor directly
// ---------------------------------------------------------------------------

test.describe('Maps list panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sites')
    await expect(page.getByTestId('sites-page')).toBeVisible()
    await expect(page.getByTestId('sites-table')).toBeVisible()
  })

  test('clicking Map opens MapsListPanel with site name in heading', async ({ page }) => {
    const firstRow = page.getByTestId('sites-table-row').first()
    const siteNameCell = firstRow.locator('td').first()
    const siteName = (await siteNameCell.textContent())?.trim() ?? ''

    await firstRow.getByTestId('sites-table-view-map').click()

    const panel = page.getByTestId('sites-page-editor-panel')
    await expect(panel).toBeVisible()

    // MapsListPanel heading is "Maps — {siteName}"
    await expect(panel.locator('h3').first()).toContainText(siteName)
  })

  test('MapsListPanel has a Close button that dismisses the panel', async ({ page }) => {
    await page.getByTestId('sites-table-view-map').first().click()
    const panel = page.getByTestId('sites-page-editor-panel')
    await expect(panel).toBeVisible()

    await panel.getByTestId('maps-list-close').click()

    await expect(panel).not.toBeVisible({ timeout: 3000 })
  })

  test('MapsListPanel has an Add Map button', async ({ page }) => {
    await page.getByTestId('sites-table-view-map').first().click()
    const panel = page.getByTestId('sites-page-editor-panel')
    await expect(panel).toBeVisible()

    await expect(panel.getByTestId('maps-list-create')).toBeVisible()
    await expect(panel.getByTestId('maps-list-create')).toContainText(/add map/i)
  })

  test('Add Map button opens create-map modal with name input', async ({ page }) => {
    await page.getByTestId('sites-table-view-map').first().click()
    const panel = page.getByTestId('sites-page-editor-panel')
    await expect(panel).toBeVisible()

    await panel.getByTestId('maps-list-create').click()

    await expect(page.getByTestId('create-map-name')).toBeVisible()
  })

  test('cancelling create-map modal returns to maps list', async ({ page }) => {
    await page.getByTestId('sites-table-view-map').first().click()
    const panel = page.getByTestId('sites-page-editor-panel')
    await expect(panel).toBeVisible()

    await panel.getByTestId('maps-list-create').click()
    await expect(page.getByTestId('create-map-name')).toBeVisible()

    await page.getByTestId('create-map-cancel').click()

    // Modal gone, maps list still open
    await expect(page.getByTestId('create-map-name')).not.toBeVisible({ timeout: 2000 })
    await expect(panel.getByTestId('maps-list-create')).toBeVisible()
  })

  test('creating a map opens the map editor canvas', async ({ page }) => {
    const siteName = `E2E Map Create ${Date.now()}`

    // First create a site to have a clean starting point
    await page.goto('/sites')
    await page.getByPlaceholder(/acme hq/i).fill(siteName)
    await page.getByRole('button', { name: /add site/i }).click()
    await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()
    await page.getByTestId('add-site-skip-equipment').click()
    await expect(page.getByTestId('add-site-map-phase')).toBeVisible()
    await page.getByTestId('add-site-skip-map').click()
    await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()

    // Find the new site and open its map panel
    const siteRow = page.getByTestId('sites-table').locator('tr', { hasText: siteName })
    await siteRow.getByTestId('sites-table-view-map').click()

    const panel = page.getByTestId('sites-page-editor-panel')
    await expect(panel).toBeVisible()

    // Click Add Map and fill in a name
    await panel.getByTestId('maps-list-create').click()
    await page.getByTestId('create-map-name').fill('Main Map')
    await page.getByTestId('create-map-submit').click()

    // Should transition to map editor — site-map-container appears
    await expect(page.getByTestId('site-map-container')).toBeVisible({ timeout: 10000 })
  })

  test('map editor shows drawing toolbar', async ({ page }) => {
    const siteName = `E2E Toolbar ${Date.now()}`

    await page.goto('/sites')
    await page.getByPlaceholder(/acme hq/i).fill(siteName)
    await page.getByRole('button', { name: /add site/i }).click()
    await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()
    await page.getByTestId('add-site-skip-equipment').click()
    await expect(page.getByTestId('add-site-map-phase')).toBeVisible()
    await page.getByTestId('add-site-skip-map').click()
    await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()

    const siteRow = page.getByTestId('sites-table').locator('tr', { hasText: siteName })
    await siteRow.getByTestId('sites-table-view-map').click()

    const panel = page.getByTestId('sites-page-editor-panel')
    await panel.getByTestId('maps-list-create').click()
    await page.getByTestId('create-map-name').fill('Toolbar Test Map')
    await page.getByTestId('create-map-submit').click()

    await expect(page.getByTestId('site-map-container')).toBeVisible({ timeout: 10000 })

    // Toolbar with zone/wire/point tools
    await expect(page.getByTestId('map-toolbar')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('map-tool-zone')).toBeVisible()
    await expect(page.getByTestId('map-tool-wire')).toBeVisible()
    await expect(page.getByTestId('map-tool-point')).toBeVisible()
  })

  test('switching to a different site updates the panel heading', async ({ page }) => {
    const rows = page.getByTestId('sites-table-row')
    const rowCount = await rows.count()
    test.skip(rowCount < 2, 'need at least 2 sites')

    const firstName = (await rows.nth(0).locator('td').first().textContent())?.trim() ?? ''
    const secondName = (await rows.nth(1).locator('td').first().textContent())?.trim() ?? ''

    await rows.nth(0).getByTestId('sites-table-view-map').click()
    const panel = page.getByTestId('sites-page-editor-panel')
    await expect(panel.locator('h3').first()).toContainText(firstName)

    await rows.nth(1).getByTestId('sites-table-view-map').click()
    await expect(panel.locator('h3').first()).toContainText(secondName)
  })

  test('maps list and equipment editor are mutually exclusive', async ({ page }) => {
    const firstRow = page.getByTestId('sites-table-row').first()

    await firstRow.getByTestId('sites-table-edit-equipment').click()
    await expect(page.getByTestId('site-equipment-editor')).toBeVisible()

    await firstRow.getByTestId('sites-table-view-map').click()
    // Map list panel replaces equipment editor
    await expect(page.getByTestId('maps-list-create')).toBeVisible()
    await expect(page.getByTestId('site-equipment-editor')).not.toBeVisible({ timeout: 2000 })
  })
})

// ---------------------------------------------------------------------------
// Sites table — sortable columns (feature/drawable-map)
// ---------------------------------------------------------------------------

test.describe('Sites table sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sites')
    await expect(page.getByTestId('sites-table')).toBeVisible()
  })

  test('Site Name column header is clickable', async ({ page }) => {
    const nameHeader = page.locator('[data-testid="sites-table"] thead th').first()
    await expect(nameHeader).toContainText('Site Name')
    // Should not throw
    await nameHeader.click()
    await expect(page.getByTestId('sites-table')).toBeVisible()
  })

  test('clicking Site Name header twice reverses sort order', async ({ page }) => {
    const rows = page.getByTestId('sites-table-row')
    const rowCount = await rows.count()
    test.skip(rowCount < 2, 'need at least 2 sites')

    const nameHeader = page.locator('[data-testid="sites-table"] thead th').first()

    // First click: sort asc
    await nameHeader.click()
    const namesAsc = await rows.evaluateAll(r =>
      r.map(row => row.querySelector('td')?.textContent?.trim() ?? '')
    )

    // Second click: sort desc
    await nameHeader.click()
    const namesDesc = await rows.evaluateAll(r =>
      r.map(row => row.querySelector('td')?.textContent?.trim() ?? '')
    )

    // The two orderings should differ (or be the same if only 1 site — but we skipped that)
    expect(namesAsc).not.toEqual(namesDesc)
  })

  test('all five column headers are present and clickable', async ({ page }) => {
    const headers = page.locator('[data-testid="sites-table"] thead th')
    const texts = await headers.allTextContents()
    const trimmed = texts.map(t => t.trim().replace(/[↑↓▲▼]/g, '').trim())

    expect(trimmed.some(t => /site name/i.test(t))).toBe(true)
    expect(trimmed.some(t => /address/i.test(t))).toBe(true)
    expect(trimmed.some(t => /client/i.test(t))).toBe(true)
    expect(trimmed.some(t => /date/i.test(t))).toBe(true)

    // Each header click should not error
    for (let i = 0; i < Math.min(texts.length, 5); i++) {
      await headers.nth(i).click()
      await expect(page.getByTestId('sites-table')).toBeVisible()
    }
  })
})
