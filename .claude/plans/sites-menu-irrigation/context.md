# context.md: sites-menu-irrigation

**UUID**: c9e3a2f1-6b4d-4e8a-8f2c-1d7a9e5f3b8a

## Architecture Decisions

- **Server/Client split**: `page.tsx` remains a Server Component for data fetching; interactive state lives in a new `SitesPageClient` client component. This follows the App Router pattern of separating data fetching from interactivity without using `useEffect` for fetching.
- **Injectable DB pattern for `updateSiteEquipmentCore`**: The core transaction logic is extracted as a pure function `updateSiteEquipmentCore(input, companyId, dbClient)` that accepts an injected `db`. The Server Action `updateSiteEquipment` is a thin wrapper that calls `getRequiredCompanyId()` first, then delegates. Testing Agent must test through the exported `updateSiteEquipment` wrapper (mocking `getRequiredCompanyId`), not call the core function directly (which is now unexported per security requirement).
- **`updateSiteEquipmentCore` and `findSiteEquipment` are private**: Both core functions have `export` removed so they are not registered as callable Server Action endpoints. Only the thin wrappers `updateSiteEquipment` and `getSiteEquipment` are exported.
- **`updateSiteEquipment` placement**: Added to `actions/sites.ts` (not `actions/site-equipment.ts`) because it operates on a site as a whole and the `SiteWithClient` type is already exported from there.
- **`updateSiteEquipmentSchema`** added to `lib/validators.ts` — reuses the existing private `controllerRow`, `zoneRow`, `backflowRow` schemas from the `saveInspectionSchema` block.
- **`SiteEquipmentEditor` starts empty**: The component starts with empty arrays for controllers/zones/backflows since the spec says "edit equipment". Loading existing data would require an additional server call — that can be added later. The UI flow is: user opens editor, adds/edits equipment, saves (full replace).
- **Toggle behavior for editor panel**: Clicking "Edit Equipment" for an already-selected site collapses the panel (toggle). Clicking a different site opens its editor directly.
- **`SitesTable` is now a client component**: Required `'use client'` because it receives an `onEditEquipment` callback (event handler). Previously it was a server component with no interactivity.

## Files Created/Modified

- `lib/validators.ts` (modified) — added `updateSiteEquipmentSchema` and `UpdateSiteEquipmentInput` export (~9 lines added)
- `actions/sites.ts` (modified) — added imports for equipment tables, `updateSiteEquipmentCore`, and `updateSiteEquipment` server action (~80 lines added)
- `app/sites/site-equipment-editor.tsx` (new, ~330 lines) — client component for editing site equipment
- `app/sites/sites-page-client.tsx` (new, ~60 lines) — client wrapper that manages `selectedSiteId` state and two-column layout
- `app/sites/sites-table.tsx` (modified, ~40 lines) — added `'use client'`, `onEditEquipment` prop, "Edit Equipment" button per row
- `app/sites/page.tsx` (modified, ~9 lines) — simplified to delegate to `SitesPageClient`

## Test IDs (data-testid attributes)

### `sites-table.tsx`
- `sites-table` — the `<table>` element wrapping all sites
- `sites-table-row` — each `<tr>` for a site row (multiple)
- `sites-table-edit-equipment` — "Edit Equipment" button in each row (multiple)

### `sites-page-client.tsx`
- `sites-page` — the `<main>` wrapper for the whole page
- `sites-page-layout` — the flex container holding table + editor panels
- `sites-page-table-panel` — the left `<section>` containing the sites table
- `sites-page-editor-panel` — the right `<section>` containing the equipment editor (only present when a site is selected)

### `site-equipment-editor.tsx`
- `site-equipment-editor` — outer wrapper `<div>` for the entire editor
- `site-equipment-editor-header` — header bar with site name and action buttons
- `site-equipment-editor-save-message` — success/error message `<span>` (only rendered when a message exists)
- `site-equipment-editor-save` — "Save" button
- `site-equipment-editor-cancel` — "Cancel" button
- `site-equipment-editor-add-backflow` — "+ Backflow" button
- `site-equipment-editor-backflow-row` — each backflow device row `<div>` (multiple)
- `site-equipment-editor-remove-backflow` — "✕" remove button on each backflow row (multiple)
- `site-equipment-editor-add-controller` — "+ Controller" button
- `site-equipment-editor-controllers-table` — the `<table>` for controllers
- `site-equipment-editor-controller-row` — each controller `<tr>` (multiple)
- `site-equipment-editor-remove-controller` — "✕" remove button on each controller row (multiple)
- `site-equipment-editor-add-zone` — "+ Zone" button
- `site-equipment-editor-zones-table` — the `<table>` for zones
- `site-equipment-editor-zone-row` — each zone `<tr>` (multiple)
- `site-equipment-editor-remove-zone` — "✕" remove button on each zone row (multiple)

#### Overview section (added in refactoring round)
- `site-equipment-editor-overview` — the `<section className="card">` wrapping the System Overview fields
- `site-equipment-editor-overview-static-pressure` — Static Pressure text input
- `site-equipment-editor-overview-backflow-installed` — Backflow Installed checkbox
- `site-equipment-editor-overview-backflow-serviceable` — Backflow Serviceable checkbox
- `site-equipment-editor-overview-isolation-valve` — Isolation Valve checkbox
- `site-equipment-editor-overview-system-notes` — System Notes textarea

## Test Setup Notes

All 15 test scenarios in `e2e/tests/09-sites-menu-irrigation.spec.ts` use the auth fixture from `e2e/fixtures/auth.ts`. Each test navigates to `/sites` after auth is automatically set up.

## Playwright Auth Method

Using `@clerk/testing` setupClerkTestingToken from `e2e/fixtures/auth.ts` — confirmed working via existing test suite.

Test import: `import { test, expect } from '../fixtures/auth'`

The fixture automatically calls `setupClerkTestingToken({ page })` before each test, bypassing Clerk hosted auth. Requires env vars: `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.

## Known Caveats / Coverage Exclusions

- `SiteEquipmentEditor` starts with empty equipment arrays. Loading existing equipment from the DB on panel open is not implemented in this task — the editor is for creating/replacing equipment wholesale (same delete-then-insert pattern as `saveInspection`).

## QA Notes
(QA Agent writes here)
