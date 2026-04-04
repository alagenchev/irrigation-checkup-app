# Playwright E2E Test Plan

This document is the implementation spec for an AI agent adding end-to-end tests with Playwright. Follow every section in order. Do not skip steps.

---

## 1. Install Playwright

```bash
npm install -D @playwright/test @clerk/testing
npx playwright install chromium
```

Add scripts to `package.json`:
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

---

## 2. Playwright Config (`playwright.config.ts` at project root)

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,   // tests share DB state — run serially
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
})
```

---

## 3. Clerk Auth Setup

This app uses Clerk for authentication. Use the `@clerk/testing/playwright` package to bypass the sign-in UI in tests.

### Required env vars (add to `.env.local` and `.env.test`):
```
CLERK_SECRET_KEY=sk_test_...         # already present
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...  # already present
E2E_CLERK_USER_ID=user_...           # test user ID from Clerk dashboard
```

### Auth fixture (`e2e/fixtures/auth.ts`):
```ts
import { test as base, expect } from '@playwright/test'
import { clerkSetup, setupClerkTestingToken } from '@clerk/testing/playwright'

export const test = base.extend({
  page: async ({ page }, use) => {
    await setupClerkTestingToken({ page })
    await use(page)
  },
})

export { expect }
```

All test files must import `test` and `expect` from this fixture, not from `@playwright/test` directly.

---

## 4. DB Seed Helper (`e2e/fixtures/db.ts`)

Each test suite that needs data should call `seedTestDb()` before running, and `clearTestData()` after.

```ts
import { execSync } from 'child_process'

export function resetDb() {
  execSync('DATABASE_URL=postgresql://localhost:5432/irrigation_test npx tsx scripts/migrate.ts', {
    stdio: 'inherit',
  })
}
```

Only call `resetDb()` in `beforeAll` of the first suite. Individual tests clean up after themselves where possible.

---

## 5. File Structure

```
e2e/
  fixtures/
    auth.ts            — Clerk auth bypass
    db.ts              — DB reset helper
  tests/
    01-auth.spec.ts
    02-inspection-create.spec.ts
    03-inspection-edit.spec.ts
    04-zones-photos.spec.ts
    05-clients-sites.spec.ts
    06-company-settings.spec.ts
playwright.config.ts
```

---

## 6. Test Suites

### `01-auth.spec.ts` — Authentication

**Before all:** None (Clerk testing token handles auth)

**Tests:**
1. `redirects unauthenticated user to sign-in`
   - Visit `/` without auth token
   - Assert URL contains `/sign-in`

2. `authenticated user sees the inspections page`
   - Visit `/` with auth token (use auth fixture)
   - Assert `h1` contains "Inspections" or nav is visible

---

### `02-inspection-create.spec.ts` — Create New Inspection

**Before all:** Ensure DB is seeded with at least one company row for the test org.

**Tests:**

1. `can navigate to new inspection form`
   - Visit `/`
   - Click "New Inspection" button
   - Assert URL is `/` (form is on the home page) and form is visible

2. `form shows validation error when site name is empty`
   - Click "Save" without filling in any fields
   - Assert error message "Required" appears next to site name

3. `can fill and save a complete inspection`
   - Fill in: Site Name = "Playwright Test Site", Date = today's date
   - Select Inspection Type = "Repair Inspection"
   - Select Status = "New"
   - Fill Notes = "Test inspection notes"
   - Click "Save"
   - Assert success message "Saved successfully." appears

4. `saved inspection appears in inspections list`
   - After saving, navigate to `/inspections`
   - Assert "Playwright Test Site" appears in the list

5. `can add a controller to the inspection`
   - Fill Site Name and Date
   - In Controllers section, fill Location = "Garage", Manufacturer = "Hunter"
   - Click "Save"
   - Assert success message

6. `can add a zone to the inspection`
   - Fill Site Name and Date
   - In Zones section, fill Zone # = "1", Description = "Front lawn"
   - Select landscape type "Full-sun turf"
   - Select irrigation type "Rotor"
   - Click "Save"
   - Assert success message

7. `can add a backflow device`
   - Fill Site Name and Date
   - Click "Add Backflow" button
   - Fill Manufacturer = "Watts", Type = "RPZ", Size = "1"
   - Click "Save"
   - Assert success message

8. `can add zone issues`
   - Fill Site Name and Date with at least one zone
   - In Zone Issues table, check "Runoff" for Zone 1
   - Click "Save"
   - Assert success message

9. `can add quote items`
   - Fill Site Name and Date
   - In Quote section, fill Location = "Zone 1", Item = "Replace head", Price = "25.00", Qty = "2"
   - Assert total shows "$50.00"
   - Click "Save"
   - Assert success message

---

### `03-inspection-edit.spec.ts` — Edit Existing Inspection

**Before all:** Create an inspection via the form (or direct DB insert) so there is at least one existing inspection to edit.

**Tests:**

1. `inspection list shows saved inspections`
   - Visit `/inspections`
   - Assert at least one row is visible in the table

2. `clicking an inspection opens it in readonly mode`
   - Visit `/inspections`
   - Click the first inspection row
   - Assert page shows "Inspection Details" heading and "Edit" button is visible
   - Assert form fields are disabled (readonly mode)

3. `can switch from readonly to edit mode`
   - Open an inspection
   - Click "Edit" button
   - Assert form fields become editable
   - Assert "Save" button appears

4. `can edit and re-save an inspection`
   - Open an inspection, click Edit
   - Change Inspection Notes to "Updated by Playwright"
   - Click "Save"
   - Assert success message
   - Click Edit again
   - Assert Notes field contains "Updated by Playwright"

5. `can preview a report`
   - Open an inspection, click Edit, click Save
   - Assert "Preview Report" button becomes available
   - Click "Preview Report"
   - Assert page shows report preview content

---

### `04-zones-photos.spec.ts` — Zone Photos

**Tests:**

1. `photo upload section is visible in edit mode`
   - Open/create an inspection in edit mode
   - Assert "Photos (0/30)" label is visible in a zone row
   - Assert "Upload" and "Capture" buttons are visible

2. `upload button is disabled when photo limit is reached`
   - This test is a unit-level check — verify the button has `disabled` attribute when `photoData.length >= 30`
   - Skip actual file upload; instead mock the state or check via accessibility

3. `annotation input is visible after a photo is added`
   - This requires a real file upload — skip if CI environment doesn't support it
   - If running locally: use `page.setInputFiles()` to upload a test image
   - Assert annotation input appears below the photo

Note: Full upload tests require R2 to be configured. Add an environment check:
```ts
test.skip(!process.env.R2_PUBLIC_URL, 'Skipping photo tests — R2_PUBLIC_URL not configured')
```

---

### `05-clients-sites.spec.ts` — Clients and Sites Pages

**Tests:**

1. `can navigate to clients page`
   - Click "Clients" in nav
   - Assert `/clients` URL and "Clients" heading

2. `can create a new client`
   - Visit `/clients`
   - Click "Add Client"
   - Fill Name = "Playwright Client", Phone = "555-0000"
   - Submit
   - Assert "Playwright Client" appears in the list

3. `can navigate to sites page`
   - Click "Sites" in nav
   - Assert `/sites` URL and "Sites" heading

4. `can create a new site`
   - Visit `/sites`
   - Click "Add Site"
   - Fill Name = "Playwright Site", Address = "123 Test St"
   - Submit
   - Assert "Playwright Site" appears in the list

5. `site autocomplete works on inspection form`
   - Visit `/` (new inspection form)
   - Type "Playwright Site" in Site Name field
   - Assert autocomplete dropdown appears with the site

---

### `06-company-settings.spec.ts` — Company Settings

**Tests:**

1. `can navigate to company settings`
   - Click "Company" in nav
   - Assert `/company` URL and "Company Settings" heading

2. `can save company settings`
   - Fill Company Name = "Playwright Test Co"
   - Fill License # = "TX-TEST-001"
   - Click Save
   - Assert success message or flash indicator

3. `settings persist after page reload`
   - Save settings as above
   - Reload the page
   - Assert Company Name field still shows "Playwright Test Co"

---

## 7. Shared Utilities (`e2e/fixtures/helpers.ts`)

```ts
import { Page } from '@playwright/test'

/** Fill in the minimum required fields for a valid inspection save */
export async function fillMinimalInspection(page: Page, siteName: string) {
  await page.getByLabel('Site Name').fill(siteName)
  // Date is pre-filled with today; no action needed
}

/** Navigate to home and click New Inspection if on a detail page */
export async function goToNewInspection(page: Page) {
  await page.goto('/')
  const newBtn = page.getByRole('button', { name: /new inspection/i })
  if (await newBtn.isVisible()) await newBtn.click()
}
```

---

## 8. Running Tests

```bash
# Start dev server first (in a separate terminal)
npm run dev

# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run a single test file
npx playwright test e2e/tests/02-inspection-create.spec.ts
```

---

## 9. CI Considerations

- E2E tests require a running Next.js server and a local Postgres DB.
- They are **not** run in Railway CI by default — they are local-only unless you configure a GitHub Actions workflow with a Postgres service container.
- Add `e2e/` to `.gitignore` for test artifacts (`playwright-report/`, `test-results/`).

---

## 10. Known Constraints

| Constraint | Detail |
|---|---|
| Clerk auth in tests | Must use `@clerk/testing` — cannot bypass via cookie manipulation |
| Photo uploads | Require R2_PUBLIC_URL; skip in CI unless R2 is configured |
| Serial execution | Tests must run serially (`workers: 1`) — they share the same DB |
| Test DB | Always run against `irrigation_test` (local), never production |
| Clerk test user | Must be a real Clerk user in a real org — use a dedicated E2E test account |
