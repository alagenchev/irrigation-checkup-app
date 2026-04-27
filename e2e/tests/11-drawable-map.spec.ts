import { test, expect } from '../fixtures/auth'

test.describe('Drawable Map', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sites')
    await expect(page.locator('[data-testid="sites-page"]')).toBeVisible()
  })

  test('Map button visible on each site row', async ({ page }) => {
    // Wait for the sites table to load
    await expect(page.getByTestId('sites-table')).toBeVisible()

    // Get all site rows
    const rows = page.locator('[data-testid="sites-table-row"]')
    const rowCount = await rows.count()

    // Verify at least one site exists
    expect(rowCount).toBeGreaterThan(0)

    // Check that each row has a Map button
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i)
      const mapButton = row.getByTestId('sites-table-view-map')
      await expect(mapButton).toBeVisible()
      await expect(mapButton).toContainText('Map')
    }
  })

  test('Map panel opens when Map button clicked', async ({ page }) => {
    await expect(page.getByTestId('sites-table')).toBeVisible()

    // Click the first Map button
    const firstMapButton = page.getByTestId('sites-table-view-map').first()
    await firstMapButton.click()

    // Verify panel and map container are visible
    await expect(page.getByTestId('sites-page-editor-panel')).toBeVisible()
    await expect(page.getByTestId('site-map-container')).toBeVisible()
  })

  test('Site name displayed in map panel heading', async ({ page }) => {
    await expect(page.getByTestId('sites-table')).toBeVisible()

    // Get the site name from the first row
    const firstRow = page.getByTestId('sites-table-row').first()
    const siteNameCell = firstRow.locator('td').first()
    const siteName = await siteNameCell.textContent()

    // Click the first Map button
    const firstMapButton = page.getByTestId('sites-table-view-map').first()
    await firstMapButton.click()

    // Verify the panel h3 contains the site name
    const panelHeading = page.getByTestId('sites-page-editor-panel').locator('h3').first()
    await expect(panelHeading).toContainText(siteName || '')
  })

  test('Close button hides the map panel', async ({ page }) => {
    await expect(page.getByTestId('sites-table')).toBeVisible()

    // Click the first Map button to open
    const firstMapButton = page.getByTestId('sites-table-view-map').first()
    await firstMapButton.click()

    // Verify panel is visible
    await expect(page.getByTestId('sites-page-editor-panel')).toBeVisible()

    // Click the close button
    const closeButton = page.getByTestId('sites-page-editor-panel').getByRole('button', { name: /close/i })
    await closeButton.click()

    // Verify panel is hidden
    await expect(page.getByTestId('sites-page-editor-panel')).not.toBeVisible({ timeout: 2000 })
  })

  test('Clicking same Map button again toggles the panel closed', async ({ page }) => {
    await expect(page.getByTestId('sites-table')).toBeVisible()

    const firstMapButton = page.getByTestId('sites-table-view-map').first()

    // Click to open
    await firstMapButton.click()
    await expect(page.getByTestId('sites-page-editor-panel')).toBeVisible()

    // Click again to close
    await firstMapButton.click()
    await expect(page.getByTestId('sites-page-editor-panel')).not.toBeVisible({ timeout: 2000 })
  })

  test('Map panel and equipment editor are mutually exclusive', async ({ page }) => {
    await expect(page.getByTestId('sites-table')).toBeVisible()

    const firstRow = page.getByTestId('sites-table-row').first()

    // Click Edit Equipment button
    const editEquipmentButton = firstRow.getByTestId('sites-table-edit-equipment')
    await editEquipmentButton.click()

    // Verify equipment editor is visible
    await expect(page.getByTestId('site-equipment-editor')).toBeVisible()

    // Click Map button
    const mapButton = firstRow.getByTestId('sites-table-view-map')
    await mapButton.click()

    // Verify map container is visible and equipment editor is hidden
    await expect(page.getByTestId('site-map-container')).toBeVisible()
    await expect(page.getByTestId('site-equipment-editor')).not.toBeVisible({ timeout: 2000 })
  })

  test('Mapbox canvas renders in the map container', async ({ page }) => {
    await expect(page.getByTestId('sites-table')).toBeVisible()

    // Click the first Map button
    const firstMapButton = page.getByTestId('sites-table-view-map').first()
    await firstMapButton.click()

    // Verify map container is visible
    await expect(page.getByTestId('site-map-container')).toBeVisible()

    // Wait for canvas to render (up to 10 seconds)
    const canvas = page.locator('[data-testid="site-map-container"] canvas')
    await expect(canvas).toBeVisible({ timeout: 10000 })
  })

  test('Drawing controls are visible after Mapbox loads', async ({ page }) => {
    await expect(page.getByTestId('sites-table')).toBeVisible()

    // Click the first Map button
    const firstMapButton = page.getByTestId('sites-table-view-map').first()
    await firstMapButton.click()

    // Wait for canvas to be visible
    const canvas = page.locator('[data-testid="site-map-container"] canvas')
    await expect(canvas).toBeVisible({ timeout: 10000 })

    // Check for drawing control buttons in the map container
    const mapContainer = page.getByTestId('site-map-container')

    // Look for polygon, line, point, and trash buttons
    const polygonBtn = mapContainer.locator('.mapboxgl-ctrl-group .mapbox-gl-draw_polygon')
    const lineBtn = mapContainer.locator('.mapboxgl-ctrl-group .mapbox-gl-draw_line')
    const pointBtn = mapContainer.locator('.mapboxgl-ctrl-group .mapbox-gl-draw_point')
    const trashBtn = mapContainer.locator('.mapboxgl-ctrl-group .mapbox-gl-draw_trash')

    await expect(polygonBtn).toBeVisible()
    await expect(lineBtn).toBeVisible()
    await expect(pointBtn).toBeVisible()
    await expect(trashBtn).toBeVisible()
  })

  test('Switching between sites updates the panel heading', async ({ page }) => {
    await expect(page.getByTestId('sites-table')).toBeVisible()

    // Check if there are at least 2 sites
    const rows = page.locator('[data-testid="sites-table-row"]')
    const rowCount = await rows.count()

    test.skip(rowCount < 2, 'Skipping: only one site exists')

    // Get names of first two sites
    const firstRow = rows.nth(0)
    const secondRow = rows.nth(1)

    const firstName = await firstRow.locator('td').first().textContent()
    const secondName = await secondRow.locator('td').first().textContent()

    // Open map for site A
    const firstMapButton = firstRow.getByTestId('sites-table-view-map')
    await firstMapButton.click()

    const panelHeading = page.getByTestId('sites-page-editor-panel').locator('h3').first()
    await expect(panelHeading).toContainText(firstName || '')

    // Click map button for site B
    const secondMapButton = secondRow.getByTestId('sites-table-view-map')
    await secondMapButton.click()

    // Verify heading changed to site B's name
    await expect(panelHeading).toContainText(secondName || '')
  })
})
