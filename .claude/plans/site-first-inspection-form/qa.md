# QA Agent Instructions: site-first-inspection-form

**UUID**: `c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f`

## Setup

Run the dev server:
```bash
npm run dev
```

Navigate to `/inspections` → click **New Inspection**.

---

## Checklist

### A — Section order

- [ ] The "Site & Client" card is the **first** interactive section visible on the new inspection form (after Company Info and Inspector)
- [ ] The section heading reads **"Site & Client"** (not "Client & Site")
- [ ] Within the card: site selector appears **above** client fields

---

### B — Existing Site group

- [ ] The existing-site search inputs (Site Name autocomplete + Site Address) are visually wrapped in a box with a label reading **"Existing Site"** (all-caps or styled heading)
- [ ] The box has a visible border that distinguishes it from the surrounding card
- [ ] The **+ New Site** button appears inside or adjacent to the group header

---

### C — Existing site selection → client auto-populate + lock

1. Type a site name that exists in the database (or partial match) and select it from the dropdown
2. Verify:
   - [ ] **Client Name** input shows the site's associated client name, visually **dimmed** (lower opacity)
   - [ ] **Client Address** input shows the site's associated client address, visually dimmed
   - [ ] **Client Email** input is present and visually dimmed (may be blank if no email on record — that is correct)
   - [ ] None of the three client fields have an active cursor/focus state; they look read-only
3. Click the **Client Name** field:
   - [ ] All three client fields immediately brighten to full opacity
   - [ ] The Client Name field becomes an editable autocomplete input (not a plain input)
   - [ ] The Client Address field becomes the `AddressAutocomplete` component
   - [ ] Client Email becomes directly editable
4. Modify the Client Name to a different value → form accepts the change without reverting

---

### D — Existing site selection → equipment lock

1. Select an existing site that has equipment (controllers, zones, or backflows) stored
2. Scroll down to the equipment sections (System Overview, Backflows, Controllers, Zones)
3. Verify:
   - [ ] Equipment fields are populated from the site data
   - [ ] Equipment sections appear **dimmed** (lower opacity)
   - [ ] Equipment fields cannot be edited by direct click (overlay intercepts the click)
4. Click anywhere in the dimmed equipment area:
   - [ ] Equipment sections immediately brighten to full opacity
   - [ ] All equipment fields are now directly editable
   - [ ] No page scroll or layout jump occurs

---

### E — New Site mode

1. Click **+ New Site** inside the "Existing Site" group
2. Verify:
   - [ ] The "Existing Site" group box disappears; plain site name + site address inputs appear
   - [ ] A **Select Existing** button is shown to switch back
   - [ ] Client Name, Address, Email fields are **not** dimmed — fully editable from the start
   - [ ] Equipment sections appear blank (fresh default controllers/zones) and are NOT dimmed
3. Enter a new site name and address
4. Click **Select Existing** to switch back:
   - [ ] Returns to the "Existing Site" group with autocomplete
   - [ ] All client fields are cleared and unlocked (plain editable state — no pre-populated data)
   - [ ] Equipment sections return to the "Select or create a site" placeholder

---

### F — Readonly / edit existing inspection

1. Open an existing saved inspection (detail page)
2. Verify:
   - [ ] The section still reads "Site & Client" with site info first
   - [ ] Client fields show the saved values — NOT dimmed (readonly mode shows all data flat, no lock UX)
   - [ ] No equipment lock overlay appears in readonly mode
3. Click **Edit** on the inspection
4. Verify no lock overlay appears — editing an existing inspection starts fully unlocked

---

### G — Regression checks

- [ ] Saving a new inspection (existing site, client modified) works correctly — client name/address/email from the modified client fields are sent, not the original locked values
- [ ] Saving a new inspection (new site mode) works correctly
- [ ] All 96 Playwright E2E tests still pass: `npx playwright test`
- [ ] Build succeeds: `npm run build`
- [ ] Unit tests pass: `npm test` (271+ tests)

---

## Sign-off

QA agent marks this task QA-complete only if:
1. All checklist items above are ✅
2. `npm run build`, `npm test`, `npx playwright test` all pass
3. No visual regressions in other form sections (Inspector, Inspection Info, Quote Items)
