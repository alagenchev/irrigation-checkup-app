# UI Tests — inspection-new-site-reset

**UUID**: `c7d8e9f0-a1b2-4c3d-8e4f-5a6b7c8d9e0f`
**Agent**: UI Test Agent (Playwright)

## Test File

Create `e2e/tests/15-inspection-new-site-reset.spec.ts`

---

## Scenarios

### 1. Client fields reset on New Site

```
test('switching to New Site clears client fields previously populated by site select')
```

Steps:
1. Navigate to `/inspections/new`
2. Select an existing site from the site selector — confirm client fields populate
3. Click "New Site" (or equivalent toggle to switch mode)
4. Assert: clientName input is empty
5. Assert: clientAddress input is empty
6. Assert: clientEmail input is empty
7. Assert: accountType input/select is empty or default
8. Assert: accountNumber input is empty

### 2. Equipment available on New Site

```
test('equipment section is visible and usable when New Site is selected')
```

Steps:
1. Navigate to `/inspections/new`
2. Click "New Site"
3. Assert: at least one controller row is visible
4. Assert: at least one zone row is visible
5. Fill in a controller field — assert value persists

### 3. Existing site flow unaffected

```
test('selecting an existing site still populates client fields')
```

Steps:
1. Navigate to `/inspections/new`
2. Select an existing site
3. Assert client fields are populated (regression guard)

### 4. Switching modes multiple times

```
test('switching existing → new → existing resets correctly each time')
```

Steps:
1. Select existing site (client fields populate)
2. Switch to New Site (client fields clear)
3. Switch back to existing and re-select a site (client fields repopulate)

---

## Dev Server

Ensure `npm run dev` is running on port 3000 before executing tests.

```
npx playwright test e2e/tests/15-inspection-new-site-reset.spec.ts
```

---

## Commit Format

```
inspection-new-site-reset (c7d8e9f0-a1b2-4c3d-8e4f-5a6b7c8d9e0f): ui-tests — E2E for client reset and equipment on new site

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
