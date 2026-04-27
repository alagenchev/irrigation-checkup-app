# UI Test Instructions: add-site-with-equipment

## Goal

Verify the end-to-end flow: create a site, add equipment inline, confirm everything is persisted. Also verify that skipping equipment works, and that the form resets correctly for the next site.

---

## Prerequisites

- Coding phase complete and committed
- Unit tests phase complete and passing
- Dev server running: `npm run dev`
- Logged into the app with a company that has at least one client

---

## Playwright Test File

**File**: `e2e/tests/10-add-site-with-equipment.spec.ts`

Follow the numbering convention of existing E2E tests in `e2e/tests/`.

---

## Test Cases

### Golden path: create site + add equipment

```ts
test('creates a site and adds equipment inline without leaving the page', async ({ page }) => {
  await page.goto('/sites')

  // --- Phase 1: fill in the site form ---
  const siteName = `E2E Site ${Date.now()}`
  await page.getByPlaceholder(/acme hq/i).fill(siteName)
  // Address and client are optional — skip for speed

  await page.getByRole('button', { name: /add site/i }).click()

  // --- Phase 2: equipment editor appears ---
  await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()
  await expect(page.getByTestId('site-equipment-editor')).toBeVisible()

  // Confirm the site name is shown in the phase 2 header
  await expect(page.getByTestId('add-site-equipment-phase')).toContainText(siteName)

  // Add a controller
  await page.getByTestId('site-equipment-editor-add-controller').click()
  await page.getByTestId('site-equipment-editor-controllers-table')
    .getByPlaceholder('Hunter').fill('Rainbird')

  // Save equipment
  await page.getByTestId('site-equipment-editor-save').click()

  // --- Return to phase 1 ---
  await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()

  // The new site now appears in the table
  await expect(page.getByTestId('sites-table')).toContainText(siteName)

  // Clicking "Edit Equipment" on the new site shows the saved controller
  await page.getByTestId('sites-table').getByText(siteName)
    .locator('..') // parent <tr>
    .getByTestId('sites-table-edit-equipment')
    .click()
  await expect(page.getByTestId('site-equipment-editor')).toBeVisible()
  await expect(page.getByTestId('site-equipment-editor-controllers-table')).toContainText('Rainbird')
})
```

### Skip equipment

```ts
test('can skip equipment and the site still appears in the table', async ({ page }) => {
  await page.goto('/sites')

  const siteName = `E2E Skip ${Date.now()}`
  await page.getByPlaceholder(/acme hq/i).fill(siteName)
  await page.getByRole('button', { name: /add site/i }).click()

  await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()

  // Skip without adding anything
  await page.getByTestId('add-site-skip-equipment').click()

  // Returns to phase 1
  await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()

  // Site is in the table
  await expect(page.getByTestId('sites-table')).toContainText(siteName)
})
```

### Form resets after skip

```ts
test('site form fields are cleared after skipping, ready for a new site', async ({ page }) => {
  await page.goto('/sites')

  await page.getByPlaceholder(/acme hq/i).fill('Site To Reset')
  await page.getByRole('button', { name: /add site/i }).click()
  await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()

  await page.getByTestId('add-site-skip-equipment').click()

  await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()
  await expect(page.getByPlaceholder(/acme hq/i)).toHaveValue('')
})
```

### Cancel from equipment editor also returns to phase 1

```ts
test('Cancel from equipment editor returns to the site form', async ({ page }) => {
  await page.goto('/sites')

  await page.getByPlaceholder(/acme hq/i).fill(`E2E Cancel ${Date.now()}`)
  await page.getByRole('button', { name: /add site/i }).click()
  await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()

  await page.getByTestId('site-equipment-editor-cancel').click()

  await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()
})
```

### Two sites in a row

```ts
test('can add two sites back-to-back without reloading the page', async ({ page }) => {
  await page.goto('/sites')

  for (const name of [`E2E First ${Date.now()}`, `E2E Second ${Date.now()}`]) {
    await page.getByPlaceholder(/acme hq/i).fill(name)
    await page.getByRole('button', { name: /add site/i }).click()
    await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()
    await page.getByTestId('add-site-skip-equipment').click()
    await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()
  }

  // Both sites appear in the table
  const tableText = await page.getByTestId('sites-table').textContent()
  expect(tableText).toContain('E2E First')
  expect(tableText).toContain('E2E Second')
})
```

### Error handling

```ts
test('shows a validation error if site name is blank', async ({ page }) => {
  await page.goto('/sites')
  // Site name is required — submitting blank should show an error (HTML required or server error)
  await page.getByRole('button', { name: /add site/i }).click()
  // Either the browser required validation fires, or the server action returns an error
  // Verify we stay in phase 1 (no equipment editor appears)
  await expect(page.getByTestId('add-site-equipment-phase')).not.toBeVisible({ timeout: 2000 })
})
```

---

## Manual Verification

After running the automated tests, confirm these visually:

- [ ] The phase 2 prompt text ("Site X created. Add equipment now, or skip…") is readable in dark theme
- [ ] The "Skip — add equipment later" button is visually distinct but not a primary CTA (should be `btn btn-sm`, not `btn-primary`)
- [ ] The equipment editor in phase 2 is visually identical to the equipment editor opened from the table — same sections, same styling
- [ ] After skipping, the new site is visible at the correct position in the sites table (alphabetically sorted, per `getSites` ordering)
- [ ] No layout shift when transitioning between phase 1 and phase 2 within the card

---

## Sign-Off Checklist

- [ ] Golden path: site + equipment saved in one session
- [ ] Saved controller appears when opening "Edit Equipment" from the table
- [ ] Skip works — site created, no equipment error
- [ ] Form resets to empty after skip/save
- [ ] Cancel from equipment editor also resets
- [ ] Back-to-back site creation works
- [ ] Error state stays in phase 1
- [ ] Dark theme readability acceptable
- [ ] No console errors during any flow

---

## Failure Reporting

Document failures with screenshot, steps to reproduce, expected vs actual, and severity.
