# Code Review — irrigation-map-ux

**UUID**: `f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c`
**Agent**: Code Review Agent (fresh session, sonnet model)
**Read first**: `README.md` and `coding.md` for full context

---

## How to review

Review each phase's diff against main:

```bash
git diff main -- lib/schema.ts actions/site-maps.ts \
  app/components/map/ lib/map-utils.ts \
  app/sites/sites-page-client.tsx app/sites/sites-table.tsx \
  app/components/site-map-editor.tsx app/components/site-map-editor-inner.tsx
```

---

## Phase 1 — Schema & Server Actions

### Schema (`lib/schema.ts`)
- [ ] `site_maps` table has `companyId` FK — non-negotiable multi-tenancy requirement
- [ ] `siteId` FK references `sites` table
- [ ] `drawing` is `jsonb`, nullable
- [ ] `updatedAt` is set via `.$onUpdateFn(() => new Date())` or explicit in mutations
- [ ] No existing tables modified in a breaking way

### Server actions (`actions/site-maps.ts`)
- [ ] Every function calls `getRequiredCompanyId()` as the FIRST line
- [ ] All queries include `eq(siteMaps.companyId, companyId)` — no cross-tenant leakage
- [ ] `deleteSiteMap` includes companyId guard in WHERE
- [ ] `saveSiteMapDrawing` includes companyId guard in WHERE
- [ ] `duplicateSiteMap` checks original belongs to same company before copying

---

## Phase 2 — Maps list UI

- [ ] `MapsListPanel` fetches via server action, not direct DB call
- [ ] Feature count derived from `drawing.features?.length ?? 0` — handles null drawing
- [ ] "Create New Map" defaults name to something sensible (not empty)
- [ ] Duplicate creates a new row — does not mutate original
- [ ] Delete has a confirmation step (confirm dialog or at minimum a second click)

---

## Phase 3 — Map canvas shell

- [ ] `MapboxDraw` plugin is completely removed — not imported anywhere in new code
- [ ] Map is initialised with `ssr: false` dynamic import (browser-only)
- [ ] `mapboxgl.accessToken` set from `NEXT_PUBLIC_MAPBOX_TOKEN`
- [ ] `map.remove()` called in effect cleanup
- [ ] No memory leaks: event listeners removed on cleanup
- [ ] Toolbar `data-testid` attributes present on all interactive elements

---

## Phase 4 — Zone drawing

- [ ] `computeZoneStats` is in `lib/map-utils.ts` as a pure function (testable without DOM)
- [ ] Area computed in sq ft (not m² left unconverted)
- [ ] Polygon is closed (first coord repeated at end) before Turf calculations
- [ ] `draftPoints` cleared on Finish and Cancel
- [ ] Undo Point pops last coordinate only — does not undo entire polygon
- [ ] Undo/Redo stack properly maintained: push to undo before mutating features, clear redo on new action

---

## Phase 5 — Zone Info panel

- [ ] Zone size shown as read-only computed value — user cannot edit it directly
- [ ] Auto-name generates "Zone 1", "Zone 2" etc. by inspecting existing zone features — not a random name
- [ ] Fill opacity stored as `0–1` float in GeoJSON properties, displayed as `0–100%`
- [ ] Color picker hex input validates hex format before applying
- [ ] Pill groups are mutually exclusive within each group (selecting one deselects others)
- [ ] Photo upload uses existing `uploadZonePhoto` action from `actions/upload.ts` — not a new upload mechanism
- [ ] `onUpdate` called with complete merged properties — no partial overwrites
- [ ] `onDelete` removes the feature from the features array and calls save

---

## Phase 6 — Points

- [ ] Point `featureType` values are type-safe literals: `'head' | 'controller' | 'repair' | 'other'`
- [ ] Controller points rendered distinctly (labeled marker, not generic pin)
- [ ] Auto-name increments per type (`Controller 1`, `Controller 2`, not just `Point 1`)
- [ ] Tapping a placed point in idle mode opens its configure/edit sheet

---

## Phase 7 — Wire

- [ ] Wire produces `LineString`, not `Polygon`
- [ ] No Zone Info panel opened after wire finish
- [ ] Wire features still included in save/undo/redo

---

## Phase 8 — Review panel

- [ ] Total area sums only zone features (not wires or points)
- [ ] Counts per feature type are correct
- [ ] Review panel is read-only — no mutations from this panel

---

## Cross-cutting concerns

- [ ] All new React components use named exports (no default exports)
- [ ] All new files follow `kebab-case.tsx` naming
- [ ] No `any` types in TypeScript
- [ ] No `console.log` in committed code
- [ ] `ZoneFeatureProperties` type defined in `types/index.ts` and used consistently
- [ ] Inline add-site-form path (no `mapId`) still works: `onDrawingChange` called instead of API save

---

## Severity scale

- **BLOCKER**: cross-tenant data leak, missing `companyId` guard, broken build, data loss risk
- **MAJOR**: auto-name logic wrong, area formula off, undo stack corrupted, map cleanup leak
- **MINOR**: naming inconsistency, missing `data-testid`, style issues

---

## Verdict

Return: **APPROVED** / **APPROVED_WITH_MINOR** / **BLOCKED** (list issues by phase)
