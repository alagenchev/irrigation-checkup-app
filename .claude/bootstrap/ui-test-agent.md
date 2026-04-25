# UI Test Agent Bootstrap

Run this at the start of your work before writing any Playwright tests.

## Step 1 — Verify Playwright is Configured

```bash
ls playwright.config.ts 2>/dev/null && echo "CONFIGURED" || echo "NOT CONFIGURED"
ls e2e/ 2>/dev/null && echo "EXISTS" || echo "MISSING"
cat package.json | grep "test:e2e"
```

If Playwright is **not configured** yet, the Orchestrator should have set it up during pre-flight. If it's still missing, stop and report to orchestrator. Do not configure it yourself — that's orchestrator's job.

## Step 2 — Read Task Context

```bash
cat .claude/plans/{task}/README.md     # Task overview
cat .claude/plans/{task}/ui-tests.md   # Test scenarios to implement
cat .claude/plans/{task}/context.md    # Architecture decisions + data-testid attributes
```

**The `context.md` is critical** — it contains all `data-testid` attributes the Coding Agent added. Use these for selectors, not fragile text-based queries.

Example from context.md:
```
## Test IDs (data-testid)
- site-selector: wrapper div
- site-selector-search: search input
- site-selector-mode-toggle: "New Site" / "Select Existing" button
- site-selector-results: dropdown list
- site-selector-result-item: individual result
```

Use these:
```ts
// ✅ Stable (from context.md)
page.locator('[data-testid="site-selector-search"]')

// ❌ Fragile (breaks when copy changes)
page.locator('button:has-text("New Site")')
```

## Step 3 — Understand Clerk Auth in Playwright

This app uses Clerk for authentication. Standard email/password login **will not work** in Playwright because Clerk uses hosted auth pages with CSRF protection.

### Correct Setup

Use `@clerk/testing` to bypass auth in tests:

```ts
// e2e/helpers/auth.ts
import { clerkSetup, setupClerkTestingToken } from '@clerk/testing/playwright'

export async function authenticateAsTestUser(page: Page) {
  await setupClerkTestingToken({ page })
  await page.goto('/')
  // App should now be authenticated
}
```

**Required environment variables** in `.env.test` or test runner config:
```
CLERK_SECRET_KEY=sk_test_...      # From Clerk dashboard → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

If these env vars are missing, stop and report to orchestrator — tests cannot run without them.

### Alternative: Test User Credentials

If `@clerk/testing` setup is not possible, use a dedicated test Clerk account:
```ts
// Only use this as fallback
async function loginWithTestAccount(page: Page) {
  await page.goto('/sign-in')
  await page.waitForURL('**/sign-in**')
  // Clerk hosted UI — use Clerk's test credentials
}
```

Document which approach works in `context.md`.

## Step 4 — Study Existing E2E Tests

```bash
ls e2e/                      # Existing test files (if any)
```

If existing tests exist, read one to understand the established auth and setup patterns. Match them.

## Step 5 — Establish Baseline

```bash
npx playwright test          # Run ALL existing E2E tests
```

Record which tests pass/fail before you add new ones. You must not break existing tests.

## Step 6 — Verify Dev Server

Playwright is configured with `webServer` in `playwright.config.ts` — it will start the dev server automatically. Confirm `npm run dev` works:

```bash
npm run build                # Ensures no compile errors in the app
```

## Step 7 — Verify Ready

- [ ] Playwright configured and present
- [ ] context.md read (data-testid list available)
- [ ] ui-tests.md read (test scenarios understood)
- [ ] Clerk auth approach confirmed
- [ ] Baseline E2E tests recorded
- [ ] `npm run build` passes

You are now ready to write Playwright tests.

## File Organization

```
e2e/
├── helpers/
│   ├── auth.ts              ← Clerk auth helper (shared)
│   └── test-data.ts         ← Test data creation helpers
├── {task-name}.spec.ts      ← Tests for this task
└── ...existing tests...
```

## Key Playwright Patterns for This App

```ts
import { test, expect } from '@playwright/test'
import { authenticateAsTestUser } from './helpers/auth'

test.describe('Site Selector', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAsTestUser(page)
    await page.goto('/')
  })

  test('should search and select a site', async ({ page }) => {
    // Always prefer data-testid selectors
    const searchInput = page.locator('[data-testid="site-selector-search"]')
    await searchInput.fill('Acme')
    
    // Wait for results (don't assume instant)
    const results = page.locator('[data-testid="site-selector-results"]')
    await expect(results).toBeVisible()
    
    // Click first result
    await page.locator('[data-testid="site-selector-result-item"]').first().click()
    
    // Verify state changed
    await expect(page.locator('[data-testid="site-selector-search"]')).toHaveValue('Acme HQ – Building A')
  })
})
```

## Failure Rule

If the same test fails 3 times after your fixes:
- Stop trying to fix it
- Document the failure clearly
- Report to orchestrator with: test name, expected, actual, hypothesis

Never push a test that is currently failing.

## Iteration Limit

You get **3 attempts** to get a test scenario working. If after 3 attempts a test scenario still can't be implemented (e.g., Clerk auth is blocking everything), escalate to user via orchestrator for a decision.
