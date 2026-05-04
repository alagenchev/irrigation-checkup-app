# UI Tests — new-site-drawable-map

**UUID**: `d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a`
**Agent**: UI Test Agent (Playwright)

## Test File

Create `e2e/tests/16-new-site-drawable-map.spec.ts`

---

## Scenarios

### 1. Full flow — skip equipment, skip map

```
test('create site → skip equipment → skip map → returns to blank form')
```

Steps:
1. Navigate to `/sites`
2. Fill in and submit Add Site form (name required)
3. Assert `[data-testid="add-site-equipment-phase"]` visible
4. Click `[data-testid="add-site-skip-equipment"]`
5. Assert `[data-testid="add-site-map-phase"]` visible
6. Assert map editor is present (Mapbox canvas or map container)
7. Click `[data-testid="add-site-skip-map"]`
8. Assert `[data-testid="add-site-form"]` visible (back to blank)

### 2. Full flow — save equipment, skip map

```
test('create site → save equipment → map phase appears → skip map')
```

Steps:
1. Create site, land on equipment phase
2. Fill in equipment and click save in SiteEquipmentEditor
3. Assert map phase appears
4. Skip map → back to blank form

### 3. Map phase — draw and close

```
test('map phase: map loads for the correct new site')
```

Steps:
1. Create site named "E2E Map Test Site"
2. Skip equipment
3. Assert map phase heading/description contains "E2E Map Test Site"
4. Assert Mapbox map loads (wait for canvas element)
5. Click close/onClose in map editor → back to blank form

### 4. Regression — equipment phase unchanged

```
test('equipment phase still works after coding changes')
```

Steps:
1. Create a site
2. Assert equipment editor visible in equipment phase (SiteEquipmentEditor rendered)
3. Assert skip-equipment button present

---

## Notes

- Mapbox requires `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local` (already set)
- Map canvas may take 1-2s to initialise — use `waitFor` / `expect.toBeVisible` with timeout
- Run: `npx playwright test e2e/tests/16-new-site-drawable-map.spec.ts`

---

## Commit Format

```
new-site-drawable-map (d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a): ui-tests — E2E for map phase in add-site flow

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
