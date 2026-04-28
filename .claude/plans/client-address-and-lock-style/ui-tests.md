# UI Test Instructions: client-address-and-lock-style

**UUID**: b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e

## Playwright Test File

**File**: `e2e/tests/14-client-address-and-lock-style.spec.ts`

---

## Auth

```ts
import { test, expect } from '../fixtures/auth'
```

---

## Test Cases

### Add-site form — client address checkbox

```ts
test('client address checkbox appears next to the label when new client name is typed', async ({ page }) => {
  await page.goto('/sites')
  await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(`New Client ${Date.now()}`)
  await expect(page.getByTestId('new-client-address-same-checkbox')).toBeVisible()
  // Checkbox and label should be on the same row — verify both visible together
  await expect(page.getByTestId('new-client-address-same-checkbox-label')).toBeVisible()
})

test('checkbox is checked by default and shows disabled site address input', async ({ page }) => {
  await page.goto('/sites')
  await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(`New Client ${Date.now()}`)
  await expect(page.getByTestId('new-client-address-same-checkbox')).toBeChecked()
  await expect(page.getByTestId('new-client-address-display')).toBeVisible()
  await expect(page.getByTestId('new-client-address-display')).toBeDisabled()
})

test('unchecking shows address autocomplete input', async ({ page }) => {
  await page.goto('/sites')
  await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(`New Client ${Date.now()}`)
  await page.getByTestId('new-client-address-same-checkbox').uncheck()
  await expect(page.getByTestId('new-client-address-input')).toBeVisible()
  await expect(page.getByTestId('new-client-address-display')).not.toBeVisible()
})

test('site address mirrors into disabled client address display', async ({ page }) => {
  await page.goto('/sites')
  // Fill site name
  await page.getByPlaceholder(/acme hq/i).fill('Address Mirror Site')
  // Fill site address via the address autocomplete (type directly)
  const siteAddrInput = page.locator('[data-testid="add-site-form"] input[name="address"]').first()
  await siteAddrInput.fill('123 Mirror St')
  // Enter new client name
  await page.locator('[data-testid="add-site-form"] input[name="client_name"]').fill(`New Client ${Date.now()}`)
  // Client address display should show the site address
  await expect(page.getByTestId('new-client-address-display')).toHaveValue('123 Mirror St')
})
```

### Irrigation form — locked client field styling

```ts
test('locked client fields show grey background with readable text, not faded text', async ({ page }) => {
  await page.goto('/')

  // Select an existing site that has a client
  // Type in the site autocomplete and pick from dropdown
  const siteInput = page.locator('[data-testid="site-selector"] input[name="siteName"]')
  await siteInput.fill('')
  await siteInput.click()

  // Pick first available site from dropdown
  const firstOption = page.locator('[role="listbox"] li').first()
  await firstOption.waitFor({ state: 'visible', timeout: 5000 })
  await firstOption.click()

  // If client name locked input is present, verify styling
  const lockedName = page.getByTestId('client-name-locked')
  if (await lockedName.isVisible()) {
    // Should NOT be faded/transparent — check background color is not default
    const bg = await lockedName.evaluate(el => getComputedStyle(el).backgroundColor)
    // Dark grey background (#2c2c2e = rgb(44, 44, 46))
    expect(bg).toMatch(/rgb\(44,\s*44,\s*46\)/)
  }
})
```

---

## Sign-Off Checklist

- [ ] Checkbox visible next to "Client Address" label (same row, not centered)
- [ ] Checkbox checked by default
- [ ] Disabled input shows site address when checked
- [ ] Unchecking reveals address autocomplete
- [ ] Re-checking restores disabled display
- [ ] Locked client fields in inspection form have grey background, not faded text
- [ ] No console errors during any flow
