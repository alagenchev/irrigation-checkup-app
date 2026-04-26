# context.md: link-irrigation-fields

**UUID**: 8f5d8c1a-7b2e-4f3a-9c6d-2e1a5f8b3c2d

## Architecture Decisions

- **Dependency injection for `findSiteEquipment`**: The pure core logic accepts `(siteId, companyId, dbClient)` as parameters, making it fully unit-testable without mocking Clerk auth. The `getSiteEquipment` Server Action is a thin wrapper that calls `getRequiredCompanyId()` first, then delegates to `findSiteEquipment`.
- **Ephemeral ID assignment in `findSiteEquipment`**: Mirrors the pattern in `getInspectionForEdit`. Controllers get ephemeral IDs 1..N, zones and backflows continue from N+1. A `controllerEphemeralMap` maps DB UUID → ephemeral int so zone `controller` FK references work in the UI.
- **ID counter reset on site select**: When `handleSiteSelect` loads equipment, it computes `maxId` from the returned ephemeral IDs and sets `nextIdRef.current = maxId + 1`, ensuring any subsequently added rows don't collide.
- **`siteSelected` initial state**: Initialized to `initialData !== undefined` — so when opening an existing inspection in edit/readonly mode, the equipment sections are visible immediately without a loading flash.
- **Conditional block order**: `equipmentLoading` → `equipmentError` → `!siteSelected` (placeholder) → equipment sections. This ensures loading and error states always render over the placeholder.
- **Sections wrapped**: Only the four equipment sections (Irrigation System Overview, Backflow Devices, Controllers, Zone Descriptions) are inside the conditional. Zone Issues and Quote Items remain unconditional so they don't disappear on page load.
- **Mode switch behavior**: Switching to "new" mode sets `siteSelected = true` with default empty equipment (1 controller, 2 zones, no backflows) — equivalent to starting a fresh form. Switching back to "Select Existing" sets `siteSelected = false` until a site is actually chosen.
- **`photoData` on equipment load**: Zones loaded from DB get `photoData: []` — photos are visit-specific and are only populated when editing an existing visit via `getInspectionForEdit`.
- **`SiteEquipment` type exported**: Exported from `actions/sites.ts` so tests and callers can reference it without duplication.
- **No schema changes**: This feature only reads existing tables; no migrations needed.

## Files Created/Modified

- `actions/sites.ts` (modified, +120 lines) — added `SiteEquipment` type, `findSiteEquipment` (pure, injectable), `getSiteEquipment` (Server Action wrapper); updated imports to include `desc`, `siteVisits`, and form data types
- `app/irrigation-form.tsx` (modified, +65 lines net) — added `getSiteEquipment` import; added `siteSelected`, `equipmentLoading`, `equipmentError` state; rewrote `handleSiteSelect` as async to call server action and populate equipment; updated `handleSiteModeChange` to set `siteSelected` appropriately; wrapped four equipment sections in conditional rendering with loading/error/placeholder states

## Test IDs (data-testid attributes)

- `equipment-loading` — section shown while equipment is being fetched (spinner/loading text)
- `equipment-error` — section shown when equipment fetch fails (error message)
- `equipment-placeholder` — section shown when no site is selected yet ("Select or create a site to manage irrigation details")

## Test Setup Notes
(Testing Agent writes here)

## Playwright Auth Method
(UI Test Agent writes here — QA Agent reads this)

## Known Caveats / Coverage Exclusions
(Testing Agent writes if any lines excluded from coverage)

## QA Notes
(QA Agent writes here)
