# Coding Instructions — inspection-new-site-reset

**UUID**: `c7d8e9f0-a1b2-4c3d-8e4f-5a6b7c8d9e0f`
**Agent**: Coding Agent

## Goal

Two changes to `app/irrigation-form.tsx`:

1. Reset all client fields when switching to "New Site" mode
2. Ensure the equipment section is usable and structured for new-site entry (using `SiteEquipmentEditor` or equivalent)

---

## Step 1 — Reset Client Fields on Mode Switch

In `handleSiteModeChange` (around line 169), inside the `if (newMode === 'new')` block, add:

```ts
setField('clientName', '')
setField('clientAddress', '')
setField('clientEmail', '')
setField('accountType', '')
setField('accountNumber', '')
```

These mirror the existing `setField('siteName', '')` and `setField('siteAddress', '')` calls already there.

---

## Step 2 — Equipment Editor for New Site

Currently when `siteMode === 'new'`, the form shows raw controller/zone/backflow inputs inline. The user wants a `SiteEquipmentEditor`-style experience.

**Option A (preferred)**: Keep existing inline fields but verify they render correctly and are not hidden. The inspection form already initialises controllers/zones/backflows in `handleSiteModeChange`. Confirm the equipment section is visible in `siteMode === 'new'` and not gated behind a `siteSelected` check that blocks it.

**Option B**: Replace with `SiteEquipmentEditor` component — only if Option A's existing UI is clearly insufficient. Check the current rendering first before replacing.

Grep for where equipment fields are conditionally rendered:
```
grep -n "siteMode\|siteSelected\|equipment" app/irrigation-form.tsx
```

Ensure equipment section renders when `siteMode === 'new'` without requiring a site to be selected first.

---

## Constraints

- Do not change the data model or API
- Do not affect the existing-site flow
- Keep `clientLocked` behaviour: new site = unlocked, existing = locked after select
- No new files unless absolutely required

---

## Commit Format

```
inspection-new-site-reset (c7d8e9f0-a1b2-4c3d-8e4f-5a6b7c8d9e0f): coding — reset client fields and show equipment on new-site mode

- Clear clientName, clientAddress, clientEmail, accountType, accountNumber in handleSiteModeChange
- Verify equipment section renders for new-site mode

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
