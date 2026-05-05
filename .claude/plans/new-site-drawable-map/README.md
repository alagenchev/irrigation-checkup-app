# Task: new-site-drawable-map

**UUID**: `d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a`
**Status**: pending

## Summary

After a new site is created via the Add Site form on the Sites page, the current flow shows a `SiteEquipmentEditor` inline (phase 2). This task adds a **map phase** (phase 3) so the user can also draw the site boundary immediately after creation, using the same `SiteMapEditor` component that exists on the Sites page.

## Current Flow

1. User fills out Add Site form → submits
2. `createdSite` state is set → `SiteEquipmentEditor` is shown inline
3. User saves or clicks "Skip" → `handleDone()` → back to blank form

## Target Flow

1. User fills out Add Site form → submits
2. `createdSite` state is set → `SiteEquipmentEditor` shown (phase 2, unchanged)
3. User saves or clicks "Skip equipment" → transitions to map phase (phase 3)
4. `SiteMapEditor` shown for the newly created site
5. User draws or clicks "Skip map" → `handleDone()` → back to blank form

## Scope

**Primary file**: `app/sites/add-site-form.tsx`

- Add a `phase: 'equipment' | 'map'` state (or extend the `createdSite` conditional)
- When `SiteEquipmentEditor` calls `onSave` or `onClose`, transition to map phase instead of calling `handleDone`
- Render `SiteMapEditor` in map phase with a "Skip — draw map later" button
- `handleDone` is only called from the map phase

**Component used**: `SiteMapEditor` from `@/app/components/site-map-editor` (already imported in `sites-page-client.tsx`; needs to be imported in `add-site-form.tsx`).

`SiteMapEditor` props: `siteId`, `siteName`, `onClose` — all available from `createdSite`.

## Acceptance Criteria

- [ ] After creating a site and saving/skipping equipment, the map editor appears
- [ ] "Skip — draw map later" button exits the map phase and returns to blank form
- [ ] Drawing on the map and closing also returns to blank form
- [ ] The existing equipment phase is unchanged
- [ ] The Sites page "Map" button on the table is unaffected

## Dependencies

- `add-site-with-equipment` (f1a2b3c4) — equipment phase must exist ✅ (completed)
- `drawable-map` (b7e4f2a1) — `SiteMapEditor` component must exist ✅ (completed)
