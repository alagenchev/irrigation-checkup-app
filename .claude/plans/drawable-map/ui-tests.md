# UI Test Instructions: drawable-map

## Goal

Verify the end-to-end drawing workflow: open the map panel from the Sites page, draw shapes, confirm auto-save, reload the page, and confirm the drawing persists.

---

## Prerequisites

- Coding phase (`coding.md`) complete and committed
- Unit tests phase (`unit-tests.md`) complete and passing
- `NEXT_PUBLIC_MAPBOX_TOKEN` set in `.env.local` with a valid Mapbox public token
- Dev server running: `npm run dev`
- At least one test site exists in the app

---

## Playwright Test File

**File**: `e2e/drawable-map.spec.ts`

Use the existing auth fixture from `e2e/fixtures/auth.ts` (the same pattern used in other E2E tests in this project).

---

## Test Cases

### 1. Map button visible in sites table

```
test('each site row has a Map button', async ({ page }) => {
  await page.goto('/sites')
  const rows = page.locator('[data-testid="sites-table-row"]')
  await expect(rows.first()).toBeVisible()
  const mapBtn = rows.first().locator('[data-testid="sites-table-view-map"]')
  await expect(mapBtn).toBeVisible()
  await expect(mapBtn).toHaveText('Map')
})
```

### 2. Clicking Map opens the panel

```
test('clicking Map button opens the map panel', async ({ page }) => {
  await page.goto('/sites')
  await page.locator('[data-testid="sites-table-view-map"]').first().click()
  await expect(page.locator('[data-testid="sites-page-editor-panel"]')).toBeVisible()
  await expect(page.locator('[data-testid="site-map-container"]')).toBeVisible()
})
```

### 3. Map panel shows site name

```
test('map panel displays the site name', async ({ page }) => {
  await page.goto('/sites')
  const firstRow = page.locator('[data-testid="sites-table-row"]').first()
  const siteName = await firstRow.locator('td').first().textContent()
  await firstRow.locator('[data-testid="sites-table-view-map"]').click()
  const panelHeading = page.locator('[data-testid="sites-page-editor-panel"] h3')
  await expect(panelHeading).toContainText(siteName?.trim() ?? '')
})
```

### 4. Close button closes the panel

```
test('Close button hides the map panel', async ({ page }) => {
  await page.goto('/sites')
  await page.locator('[data-testid="sites-table-view-map"]').first().click()
  await expect(page.locator('[data-testid="sites-page-editor-panel"]')).toBeVisible()
  await page.locator('[data-testid="sites-page-editor-panel"] button', { hasText: 'Close' }).click()
  await expect(page.locator('[data-testid="sites-page-editor-panel"]')).not.toBeVisible()
})
```

### 5. Clicking same Map button again toggles panel off

```
test('clicking Map button again closes the panel (toggle)', async ({ page }) => {
  await page.goto('/sites')
  const mapBtn = page.locator('[data-testid="sites-table-view-map"]').first()
  await mapBtn.click()
  await expect(page.locator('[data-testid="sites-page-editor-panel"]')).toBeVisible()
  await mapBtn.click()
  await expect(page.locator('[data-testid="sites-page-editor-panel"]')).not.toBeVisible()
})
```

### 6. Map and equipment panels are mutually exclusive

```
test('opening Map panel closes equipment editor panel', async ({ page }) => {
  await page.goto('/sites')
  const row = page.locator('[data-testid="sites-table-row"]').first()
  // Open equipment editor
  await row.locator('[data-testid="sites-table-edit-equipment"]').click()
  await expect(page.locator('[data-testid="sites-page-editor-panel"]')).toBeVisible()
  // Switch to map
  await row.locator('[data-testid="sites-table-view-map"]').click()
  // Panel still visible but now shows map (not equipment editor)
  await expect(page.locator('[data-testid="site-map-container"]')).toBeVisible()
  await expect(page.locator('[data-testid="site-equipment-editor"]')).not.toBeVisible()
})
```

### 7. Mapbox map renders (canvas element present)

Mapbox renders to a `<canvas>` element. Wait for it to appear as a proxy for map load:

```
test('Mapbox canvas renders inside the map container', async ({ page }) => {
  await page.goto('/sites')
  await page.locator('[data-testid="sites-table-view-map"]').first().click()
  // Wait up to 10s for Mapbox to paint
  await expect(
    page.locator('[data-testid="site-map-container"] canvas')
  ).toBeVisible({ timeout: 10000 })
})
```

### 8. Drawing controls are present

MapboxDraw renders control buttons. Confirm they appear after map load:

```
test('drawing controls (polygon, line, point, trash) are visible', async ({ page }) => {
  await page.goto('/sites')
  await page.locator('[data-testid="sites-table-view-map"]').first().click()
  await page.locator('[data-testid="site-map-container"] canvas').waitFor({ timeout: 10000 })
  // MapboxDraw renders .mapbox-gl-draw_ctrl-draw-btn buttons inside .mapboxgl-ctrl-group
  await expect(page.locator('.mapboxgl-ctrl-group .mapbox-gl-draw_polygon')).toBeVisible()
  await expect(page.locator('.mapboxgl-ctrl-group .mapbox-gl-draw_line')).toBeVisible()
  await expect(page.locator('.mapboxgl-ctrl-group .mapbox-gl-draw_point')).toBeVisible()
  await expect(page.locator('.mapboxgl-ctrl-group .mapbox-gl-draw_trash')).toBeVisible()
})
```

### 9. Switching between sites loads that site's panel

```
test('clicking Map on a different site loads that site', async ({ page }) => {
  await page.goto('/sites')
  const rows = page.locator('[data-testid="sites-table-row"]')
  const count = await rows.count()
  if (count < 2) test.skip() // need 2 sites for this test

  const nameA = await rows.nth(0).locator('td').first().textContent()
  const nameB = await rows.nth(1).locator('td').first().textContent()

  await rows.nth(0).locator('[data-testid="sites-table-view-map"]').click()
  await expect(page.locator('[data-testid="sites-page-editor-panel"] h3')).toContainText(nameA?.trim() ?? '')

  await rows.nth(1).locator('[data-testid="sites-table-view-map"]').click()
  await expect(page.locator('[data-testid="sites-page-editor-panel"] h3')).toContainText(nameB?.trim() ?? '')
})
```

---

## Manual Verification (not automatable in Playwright)

The following require visual confirmation by the UI test agent — document findings in the status file.

### Drawing persistence smoke test

1. Open a site's map
2. Click the polygon draw button in the map controls
3. Click several points on the map to draw a polygon, double-click to finish
4. Open DevTools → Network tab — confirm a POST to `/api/sites/.../drawing` fires with a `200` response and a valid GeoJSON body
5. Reload the page (`F5`)
6. Click "Map" on the same site
7. Confirm the polygon appears on the map after reload

**Expected**: Drawing persists across page reloads.

### Delete drawing persistence

1. Draw a shape as above
2. Click the trash control button
3. Confirm auto-save fires (POST with empty `{ features: [] }`)
4. Reload
5. Open same site's map
6. Confirm map is empty

**Expected**: Deletion persists.

---

## Accessibility

- [ ] "Map" button has accessible text (no icon-only button without aria-label)
- [ ] Map container has `role="region"` or equivalent landmark if added
- [ ] Close button is keyboard accessible (Tab + Enter)
- [ ] Focus is not trapped inside the map panel

---

## Dark Theme

- [ ] Panel heading and Close button text are readable (`#ffffff` or `#f4f4f5`)
- [ ] Panel background is distinguishable from the sites table card
- [ ] Map does not bleed outside its container

---

## Sign-Off Checklist

- [ ] Map button present in every row
- [ ] Panel opens and closes correctly
- [ ] Toggle behavior works
- [ ] Equipment and Map panels are mutually exclusive
- [ ] Mapbox map renders (canvas visible)
- [ ] Drawing controls visible
- [ ] Switching sites works
- [ ] Drawing persistence confirmed manually (POST fires, reloads correctly)
- [ ] Accessibility checks pass
- [ ] Dark theme contrast acceptable
- [ ] No console errors related to the map or API routes

---

## Failure Reporting

For any failing test, document:

- Test name and file
- Screenshot or console output
- Steps to reproduce
- Expected vs actual
- Severity: critical / high / medium / low
