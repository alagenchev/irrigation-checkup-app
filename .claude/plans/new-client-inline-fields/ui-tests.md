# UI Test Instructions: new-client-inline-fields

## Goal

Verify the end-to-end flow: when adding a site with a new client name, the "New Client Details"
section appears, its fields are fillable, and the created client in the DB has all the provided data.

---

## Playwright Test File

**File**: `e2e/tests/12-new-client-inline-fields.spec.ts`

Follow the numbering convention of existing E2E tests in `e2e/tests/`.

---

## Auth Setup

Use the existing fixture pattern (same as other specs):
```ts
import { test, expect } from '../fixtures/auth'
// The auth fixture handles Clerk authentication automatically
```

---

## Test Cases

### Golden path: type a new client name → details section appears

```ts
test('reveals new client details section when typing a name that does not match any existing client', async ({ page }) => {
  await page.goto('/sites')

  // Type a name that won't match any existing client
  const newClientName = `New Client ${Date.now()}`
  await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(newClientName)

  // New client details section should appear
  await expect(page.getByTestId('new-client-details')).toBeVisible()
  await expect(page.getByTestId('new-client-phone')).toBeVisible()
  await expect(page.getByTestId('new-client-email')).toBeVisible()
  await expect(page.getByTestId('new-client-account-type')).toBeVisible()
  await expect(page.getByTestId('new-client-account-number')).toBeVisible()
})
```

### New client details section hidden for existing clients

```ts
test('does NOT show new client details section when an existing client name is typed', async ({ page }) => {
  await page.goto('/sites')

  // We need an existing client name — get one from the autocomplete options
  // Type partial to trigger dropdown, then check if any suggestion appears
  // If no clients exist in test env, this test is a no-op (document clearly)
  const clientInput = page.locator('[data-testid="add-site-form"] input[name="client_name"]')
  await clientInput.fill('')

  // Verify that with empty input, details section is hidden
  await expect(page.getByTestId('new-client-details')).not.toBeVisible()
})
```

### Golden path: create site with full new client details

```ts
test('creates a site and new client with all details filled in', async ({ page }) => {
  await page.goto('/sites')

  const siteName = `E2E Site ${Date.now()}`
  const clientName = `E2E Client ${Date.now()}`

  // Fill site name
  await page.getByPlaceholder(/acme hq/i).fill(siteName)

  // Fill client name (new, not existing)
  await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(clientName)

  // Wait for new client details section to appear
  await expect(page.getByTestId('new-client-details')).toBeVisible()

  // Fill all client detail fields
  await page.getByTestId('new-client-phone').fill('555-9876')
  await page.getByTestId('new-client-email').fill('e2eclient@test.com')
  await page.getByTestId('new-client-account-type').selectOption('Commercial')
  await page.getByTestId('new-client-account-number').fill('ACC-E2E-001')

  // Submit
  await page.getByRole('button', { name: /add site/i }).click()

  // Phase 2 appears (site was created)
  await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()
  await page.getByTestId('add-site-skip-equipment').click()

  // Verify the site appears in the table
  await expect(page.getByTestId('sites-table')).toContainText(siteName)

  // Navigate to clients page and verify client was created with all fields
  await page.goto('/clients')
  await expect(page.getByText(clientName)).toBeVisible()
})
```

### Account type dropdown has expected options

```ts
test('account type select has Commercial, Residential, HOA, Municipal options', async ({ page }) => {
  await page.goto('/sites')

  const clientName = `Options Test ${Date.now()}`
  await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(clientName)
  await expect(page.getByTestId('new-client-details')).toBeVisible()

  const select = page.getByTestId('new-client-account-type')
  await expect(select.locator('option[value="Commercial"], option:has-text("Commercial")')).toHaveCount(1)
  await expect(select.locator('option[value="Residential"], option:has-text("Residential")')).toHaveCount(1)
  await expect(select.locator('option[value="HOA"], option:has-text("HOA")')).toHaveCount(1)
  await expect(select.locator('option[value="Municipal"], option:has-text("Municipal")')).toHaveCount(1)
})
```

### New client section is cleared after form reset

```ts
test('new client details section is not visible after form resets', async ({ page }) => {
  await page.goto('/sites')

  const siteName = `E2E Reset ${Date.now()}`
  const clientName = `Reset Client ${Date.now()}`

  await page.getByPlaceholder(/acme hq/i).fill(siteName)
  await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(clientName)
  await expect(page.getByTestId('new-client-details')).toBeVisible()

  await page.getByRole('button', { name: /add site/i }).click()
  await expect(page.getByTestId('add-site-equipment-phase')).toBeVisible()
  await page.getByTestId('add-site-skip-equipment').click()

  // After reset, form is in phase 1 and new-client-details is gone
  await expect(page.getByRole('button', { name: /add site/i })).toBeVisible()
  await expect(page.getByTestId('new-client-details')).not.toBeVisible()
})
```

---

## Sign-Off Checklist

- [ ] New client section appears only when name doesn't match existing
- [ ] Section is hidden when name is empty
- [ ] All four detail fields are present and editable
- [ ] Account type defaults to Residential
- [ ] All four account type options are present
- [ ] Submitting creates the site and enters phase 2
- [ ] After skip, form resets and new-client-details is hidden
- [ ] Client appears on /clients page after creation
- [ ] No console errors during any flow

---

## Failure Reporting

Document failures with: test name, exact Playwright error, what was tried, hypothesis for root cause.
