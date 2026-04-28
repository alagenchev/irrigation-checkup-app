# UI Test Instructions: autopopulate-client-on-site-select

## Goal

Verify end-to-end that selecting a site with a client on the new inspection form
auto-populates client email, account type, and account number.

## Playwright Test File

**File**: `e2e/tests/13-autopopulate-client-on-site-select.spec.ts`

---

## Prerequisites

- A site exists in the test account that is linked to a client with email, accountType, and accountNumber filled in.
- The test may need to first create this data (site + client) or use seeded test data.
- If no such site/client exists, the test should create one via the /sites and /clients pages first.

---

## Auth

Use the existing fixture:
```ts
import { test, expect } from '../fixtures/auth'
```

---

## Test Cases

### Golden path: select site → client fields auto-fill

```ts
test('selecting a site with a client auto-populates email, account type, and account number', async ({ page }) => {
  await page.goto('/')

  // Select an existing site that has a client with full info
  // Type site name in the site selector autocomplete
  // Select the site from the dropdown

  // Verify client name is populated
  // Verify client email is populated
  // Verify account type matches client's account type
  // Verify account number matches client's account number
})
```

### Partial client: only name/address set, other fields stay default

```ts
test('selecting a site whose client has no email leaves email blank', async ({ page }) => {
  await page.goto('/')
  // Select a site whose client has no email
  // Verify email field is empty
  // Verify accountType still has its default value
})
```

### Site with no client: client section stays empty

```ts
test('selecting a site with no client leaves client fields blank', async ({ page }) => {
  await page.goto('/')
  // Select a site with no linked client
  // Verify clientName is empty
  // Verify clientEmail is empty
})
```

---

## Sign-Off Checklist

- [ ] Site select populates clientEmail
- [ ] Site select populates accountType from client
- [ ] Site select populates accountNumber from client
- [ ] Null fields don't overwrite existing defaults
- [ ] No console errors during flow
