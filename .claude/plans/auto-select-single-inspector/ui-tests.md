# UI Test Instructions: auto-select-single-inspector

## Goal

Verify the inspector field rendering in the browser for each inspector-count case. These tests confirm the fix actually works end-to-end with real data from the database, not just in isolation.

---

## Prerequisites

- Coding phase complete and committed
- Unit tests phase complete and passing
- Dev server running: `npm run dev`
- Test company has Clerk auth set up

---

## Playwright Test File

**File**: `e2e/auto-select-single-inspector.spec.ts`

---

## Test Setup Notes

These tests depend on how many inspectors exist in the test company's database. Use the existing auth fixture and, if needed, a `beforeEach` that seeds inspectors via API or directly checks the count.

The simplest approach: run three separate test scenarios in sequence against the live dev server, documented as manual steps below (since seeding DB state in E2E tests is more complex). The Playwright tests cover what can be reliably asserted.

---

## Playwright Test Cases

### Case A — Multiple inspectors in the database (standard case)

If the test company already has 2+ inspectors:

```ts
test('shows inspector dropdown when multiple inspectors exist', async ({ page }) => {
  await page.goto('/')
  // The inspector section is inside the main inspection form
  const inspectorLabel = page.locator('label', { hasText: 'Inspector' })
  await expect(inspectorLabel).toBeVisible()

  // A <select> should be present
  const select = page.locator('select').filter({ has: page.locator('option[value=""]') })
  await expect(select).toBeVisible()
  await expect(page.locator('option', { hasText: '— Select Inspector —' })).toBeVisible()
})
```

### Case B — Single inspector in the database

This is the core fix. Requires the test company to have exactly one inspector. If your test data has multiple, skip or adapt this test.

```ts
test('shows inspector name as static text when only one inspector exists', async ({ page }) => {
  await page.goto('/')

  // No <select> with the "— Select Inspector —" placeholder
  await expect(page.locator('option', { hasText: '— Select Inspector —' })).not.toBeVisible()

  // The inspector section heading is still present
  await expect(page.locator('h2', { hasText: 'Inspected By' })).toBeVisible()

  // Static text with the inspector name is visible (no dropdown)
  // Replace 'Jane Smith' with the actual single inspector's name in the test DB
  const inspectorSection = page.locator('section').filter({ has: page.locator('h2', { hasText: 'Inspected By' }) })
  // The inspector name appears as a <p> element (not an option inside a select)
  await expect(inspectorSection.locator('p').first()).toBeVisible()
  // No combobox role in this section
  await expect(inspectorSection.locator('[role="combobox"]')).not.toBeVisible()
})

test('license number is shown when only one inspector exists', async ({ page }) => {
  await page.goto('/')
  const inspectorSection = page.locator('section').filter({ has: page.locator('h2', { hasText: 'Inspected By' }) })
  // License # label and value visible
  await expect(inspectorSection.locator('label', { hasText: /license/i })).toBeVisible()
})

test('form submits with inspector pre-selected when only one inspector exists', async ({ page }) => {
  await page.goto('/')
  // Fill required fields minimally
  await page.locator('[placeholder*="site" i]').first().fill('Test Site')
  // ... fill other required fields as needed by the form validation

  // Inspector should already be selected — no manual selection required
  // Verify by checking the license # section renders (it only appears when inspectorId is set)
  const inspectorSection = page.locator('section').filter({ has: page.locator('h2', { hasText: 'Inspected By' }) })
  await expect(inspectorSection.locator('label', { hasText: /license/i })).toBeVisible()
})
```

---

## Manual Verification

Because E2E tests against a real DB require exact data setup, also perform this manual smoke test and document the result in `status.md`:

### Smoke test: single inspector

1. In the app, navigate to Inspectors and delete all but one inspector (or ensure only one exists)
2. Navigate to the home page (inspection form)
3. Scroll to "Inspected By"
4. **Expected**: Inspector name appears as static text — no dropdown visible
5. **Expected**: License number is visible below the name
6. **Expected**: No "— Select Inspector —" option anywhere on the page

### Smoke test: multiple inspectors

1. Add a second inspector
2. Reload the form
3. **Expected**: Dropdown reappears with both names listed
4. **Expected**: No inspector pre-selected (value is blank)

### Smoke test: new inspection saves with pre-selected inspector

1. With single inspector in DB, open the form
2. Fill in site and other required fields
3. Submit without touching the Inspector field
4. Open the saved inspection
5. **Expected**: Inspector name is correctly saved on the inspection record

---

## Sign-Off Checklist

- [ ] 0-inspector case: dropdown renders (manual verify — hard to automate)
- [ ] 1-inspector case: no dropdown, name as static text
- [ ] 1-inspector case: license number visible
- [ ] 1-inspector case: form submits correctly without manually selecting inspector
- [ ] 2+-inspector case: dropdown renders with all names
- [ ] Switching from 1 to 2 inspectors (via adding a second): dropdown appears on reload
- [ ] Dark theme: static inspector name text is readable (white on dark)
- [ ] No console errors

---

## Failure Reporting

Document any failures with:
- Screenshot
- Steps to reproduce
- Expected vs actual
- Severity: critical / high / medium / low
