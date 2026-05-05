# Task: inspection-new-site-reset

**UUID**: `c7d8e9f0-a1b2-4c3d-8e4f-5a6b7c8d9e0f`
**Branch**: feature/drawable-map (or new branch off main)
**Status**: pending

## Summary

On the new inspection screen, when the user switches to "New Site" mode, two things should happen:

1. **Reset client fields** — any client info that was auto-populated from a previously selected existing site (clientName, clientAddress, clientEmail, accountType, accountNumber) must be cleared.
2. **Inline equipment editor** — equipment information should be available to add, using the same `SiteEquipmentEditor` component pattern used on the Sites page after adding a new site (`add-site-with-equipment` task).

## Problem Details

### Client Reset Bug
In `app/irrigation-form.tsx`, `handleSiteModeChange` (line 169) switches to 'new' mode and clears `siteName`/`siteAddress` + resets controllers/zones/backflows — but does **not** clear:
- `clientName`
- `clientAddress`
- `clientEmail`
- `accountType`
- `accountNumber`

If the user previously selected an existing site (which auto-populates client fields via `handleSiteSelect`), those values persist when they switch to "New Site".

### Equipment Editor
Currently when 'new' mode is selected, bare controller/zone/backflow fields appear inline in the inspection form. The user wants the richer, structured `SiteEquipmentEditor` component (from `app/sites/site-equipment-editor.tsx`) to be used instead, consistent with the "add site with equipment" flow on the Sites page.

## Scope

**Primary file**: `app/irrigation-form.tsx`
- In `handleSiteModeChange` when `newMode === 'new'`: add `setField` calls to clear all client fields
- Replace the inline equipment section (when siteMode === 'new') with `SiteEquipmentEditor` or a comparable structured UI

**Possibly affected**: No schema or API changes needed. Pure UI.

## Acceptance Criteria

- [ ] Selecting an existing site, then switching to "New Site" clears all client fields (name, address, email, account type, account number)
- [ ] Client fields are blank and editable when "New Site" is selected
- [ ] Equipment editor is available and usable when "New Site" is selected
- [ ] Existing site flow is unaffected (selecting a site still populates client fields)
- [ ] Form submission still works correctly for both existing and new site paths

## Dependencies

- `add-site-with-equipment` (f1a2b3c4) — `SiteEquipmentEditor` component must exist ✅ (completed)
- `site-first-inspection-form` (c3d4e5f6) — site selector UI must be in place ✅ (completed)
