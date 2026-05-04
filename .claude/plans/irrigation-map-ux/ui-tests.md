# UI Tests — irrigation-map-ux

**UUID**: `f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c`
**Agent**: UI Test Agent (Playwright)
**Read first**: `README.md` for full UX spec from frames

---

## Test file

Create `e2e/tests/17-irrigation-map-ux.spec.ts`

Use `import { test, expect } from '../fixtures/auth'`

Dev server must be running on port 3000.

---

## Setup helpers

```ts
async function openMapsPanel(page, siteName: string) {
  await page.goto('/sites')
  await expect(page.getByTestId('sites-page')).toBeVisible()
  const row = page.getByTestId('sites-table-row').filter({ hasText: siteName })
  await row.getByTestId('sites-table-view-map').click()
  await expect(page.getByTestId('maps-list-panel')).toBeVisible()
}

async function createAndOpenMap(page, siteName: string, mapName: string) {
  await openMapsPanel(page, siteName)
  await page.getByTestId('create-new-map-button').click()
  await page.getByTestId('create-map-name-input').fill(mapName)
  await page.getByTestId('create-map-confirm').click()
  await expect(page.getByTestId('map-canvas')).toBeVisible({ timeout: 8000 })
}
```

---

## Phase 2 — Maps list

```
test.describe('Maps list panel', () => {

  test('Maps button opens maps list panel for the site')
  // Click "Maps" on a site row → panel opens with "Maps for this Property" heading

  test('existing maps show with name, feature count, and date')
  // Assumes at least one saved map exists for the test site

  test('Create New Map opens modal and creates a map')
  // Click "+ Create New Map" → modal → type name → Create → map canvas opens

  test('Duplicate creates a copy of the map')
  // Existing map → Duplicate → new map appears in list with copy suffix

  test('Delete removes map from list')
  // Delete → confirm → map no longer in list

  test('Edit opens the map canvas for that map')
  // Click Edit → [data-testid="map-canvas"] visible
})
```

---

## Phase 3 — Map canvas shell

```
test.describe('Map canvas', () => {

  test('Mapbox satellite map loads within 10 seconds')
  // await expect(page.locator('[data-testid="map-canvas"] canvas')).toBeVisible({ timeout: 10000 })

  test('toolbar is visible with Undo, Redo, tool buttons')
  // getByTestId('map-toolbar') visible; Undo, Redo, point/zone/wire tool buttons present

  test('Review and Exit buttons are visible')
  // getByTestId('map-review-btn') and getByTestId('map-exit-btn')

  test('Exit button returns to maps list')
  // Click Exit → maps-list-panel visible again

  test('Undo is disabled initially')
  // getByTestId('map-undo') toBeDisabled()

  test('"All synced" status shown initially')
  // getByTestId('map-sync-status') toContainText('All synced')
})
```

---

## Phase 4 — Zone drawing

```
test.describe('Zone drawing', () => {

  test('clicking zone tool activates Drawing Zone mode tag')
  // Click map-tool-zone → getByTestId('map-mode-tag') toContainText('Drawing Zone')

  test('tapping map in zone mode places points and shows stats bar')
  // Click zone tool → click map 3 times → stats bar visible with sq ft and point count

  test('Undo Point removes the last placed point')
  // Place 4 points → click Undo Point → stats shows 3 points

  test('Cancel clears draft points and resets mode')
  // Place 3 points → Cancel → mode tag gone, stats bar gone

  test('Finish with 3+ points saves the zone and opens Zone Info panel')
  // Place 3 points → Finish → getByTestId('zone-info-panel') visible

  test('pressing ✕ on mode tag cancels drawing')
  // Zone mode active → click ✕ on mode tag → mode resets to idle
})
```

---

## Phase 5 — Zone Info panel

```
test.describe('Zone Info panel', () => {

  test('zone size is shown in sq ft after finishing polygon')
  // zone-info-panel contains '~' and 'sq ft'

  test('Zone Name input is editable')
  // Fill zone name input → value persists

  test('Auto-name button fills name with sequential zone name')
  // Click Auto-name → input has value like "Zone 1"

  test('Fill opacity slider changes displayed percentage')
  // Drag slider → percentage label updates

  test('selecting a color updates the hex input')
  // Click a color swatch → hex input shows that color

  test('polygon role pill selection is mutually exclusive')
  // Click Hydrozone → Zone deselected, Hydrozone selected

  test('area type pill selection is mutually exclusive')
  // Click Bed → Turf deselected, Bed selected

  test('sun exposure pill selection is mutually exclusive')
  // Click Shade → Mixed deselected, Shade selected

  test('grass type input accepts text')
  // Type "Bermuda" → input value is "Bermuda"

  test('Done closes panel and zone stays on map')
  // Click Done → panel gone, zone polygon visible on map

  test('Delete removes zone from map')
  // Click Delete → confirm → panel gone, zone no longer rendered
})
```

---

## Phase 6 — Point placement

```
test.describe('Point placement', () => {

  test('clicking point tool then tapping map shows Add a Point sheet')
  // Click map-tool-point → click on map → add-point-panel visible

  test('Add a Point shows Heads, System Components, Repair, Other')
  // All 4 options visible

  test('Cancel dismisses the sheet without placing a point')
  // Cancel → sheet gone, no new marker on map

  test('selecting System Components shows configure sheet')
  // System Components → configure-point-panel visible with "Configure Controller"

  test('creating a controller places a labeled marker on the map')
  // Fill name "Test Controller" → Create → marker visible with label
})
```

---

## Phase 7 — Wire drawing

```
test.describe('Wire drawing', () => {

  test('wire tool activates Drawing Wire mode tag')
  // map-mode-tag contains 'Drawing Wire'

  test('Finish with 2+ points saves wire without opening Zone Info panel')
  // Place 2 points → Finish → zone-info-panel NOT visible, wire rendered on map
})
```

---

## Phase 8 — Review

```
test.describe('Review panel', () => {

  test('Review button opens review panel')
  // getByTestId('map-review-panel') visible

  test('review shows zone and point counts')
  // Panel contains zone count text

  test('total irrigated area is shown')
  // Panel contains area in sq ft

  test('Done returns to map canvas')
  // Click Done → review-panel gone, map-canvas visible
})
```

---

## Regression guards

```
test.describe('Regressions', () => {

  test('inline map in Add Site form still shows and accepts GPS center')
  // /sites page → add-site form has map visible

  test('existing map flow on Sites table still works after schema change')
  // Old "Maps" button still opens maps list (not broken by schema migration)
})
```

---

## Notes

- Many tests require at least one site in the test DB — use existing site setup from auth fixture
- Map canvas tests need a `timeout: 10000` for Mapbox initialisation
- Zone drawing tests click on the Mapbox canvas — use `page.mouse.click(x, y)` with coordinates relative to the canvas element bounding box
- Run: `npx playwright test e2e/tests/17-irrigation-map-ux.spec.ts`

---

## Commit format

```
irrigation-map-ux (f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c): ui-tests — E2E for map UX phases 1-8

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
