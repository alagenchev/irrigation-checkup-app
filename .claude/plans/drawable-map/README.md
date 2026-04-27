# Task: drawable-map

**UUID**: `b7e4f2a1-c3d5-4e6b-9f8a-2c1d3e4f5a6b`

**Purpose**: Add a drawable satellite map to the Sites page so technicians can sketch irrigation layouts (zones as polygons, pipes as lines, sprinklers as points) directly on a Mapbox satellite map. Drawings are saved as GeoJSON and reload automatically when the site is reopened.

**Current State**: Sites page shows a sites table with an equipment editor panel. No map or spatial drawing capability exists.

**Desired State**: Each site row has a "Map" button. Clicking it opens a right-side panel with a Mapbox satellite map and drawing controls. Users can draw, edit, and delete shapes. Drawings auto-save on every change and reload on next visit.

## Instruction Files

- **[coding.md](./coding.md)** — Schema, API routes, map component, SitesPageClient integration
- **[unit-tests.md](./unit-tests.md)** — Tests for API route handlers and multi-tenancy
- **[ui-tests.md](./ui-tests.md)** — Playwright E2E tests for the full drawing workflow

## Architecture Summary

| Piece | Decision |
|---|---|
| Drawing library | `@mapbox/mapbox-gl-draw` |
| Map style | `mapbox://styles/mapbox/satellite-streets-v12` |
| Data format | GeoJSON FeatureCollection — stored as-is, never transformed |
| Storage | New `site_drawings` table: one row per site (upsert) |
| API | Route Handlers — GET + POST `/api/sites/[siteId]/drawing` |
| Component | Client component via `next/dynamic` with `ssr: false` |
| Panel slot | Reuses existing right-panel pattern from equipment editor |
| Auth | `getRequiredCompanyId()` + site ownership check in every handler |
| Env var | `NEXT_PUBLIC_MAPBOX_TOKEN` (already public — client-side Mapbox) |

## Constraints (from intake)

- No custom shape styling
- No snapping
- No distance/area measurements
- Do NOT transform GeoJSON — store and return as-is
- Keep implementation minimal

## Related Tasks

- Depends on: (none — standalone feature)
- Blocks: (none)

## Notes

- Mapbox GL and MapboxDraw must be dynamically imported (`ssr: false`) — they reference `window` and `document`
- The existing two-panel layout in `SitesPageClient` is the integration point; extend `panelState` to support a `'map'` mode alongside the existing `'equipment'` mode
- `NEXT_PUBLIC_MAPBOX_TOKEN` must be added to `.env.local` (and documented in `.env.local.example` / README) before the component will render
