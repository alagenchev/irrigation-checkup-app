# Unit Tests — inspection-new-site-reset

**UUID**: `c7d8e9f0-a1b2-4c3d-8e4f-5a6b7c8d9e0f`
**Agent**: Testing Agent

## Test File

Add tests to `__tests__/irrigation-form.test.tsx` (already exists, currently ~63 tests).

---

## Test Cases to Add

### 1. Client fields reset when switching to New Site mode

```
describe('New Site mode — client field reset', () => {
  it('clears clientName when switching from existing site to new site')
  it('clears clientAddress when switching from existing site to new site')
  it('clears clientEmail when switching from existing site to new site')
  it('clears accountType when switching from existing site to new site')
  it('clears accountNumber when switching from existing site to new site')
  it('clears all client fields in a single mode switch')
})
```

**Setup pattern**:
1. Render form with sites + clients props
2. Simulate selecting an existing site (which auto-fills client fields)
3. Click "New Site" toggle/button
4. Assert each client field is empty

### 2. Equipment section visible in New Site mode

```
describe('New Site mode — equipment', () => {
  it('shows equipment section when New Site is selected')
  it('does not require siteSelected=true to show equipment in new-site mode')
})
```

### 3. No regression — existing site flow

```
describe('Existing site flow unaffected', () => {
  it('still populates client fields when an existing site is selected')
  it('still locks client fields after existing site is selected')
})
```

---

## Coverage Target

Maintain ≥90% coverage on `irrigation-form.tsx`. Run:
```
npm test -- --coverage --testPathPattern=irrigation-form
```

---

## Commit Format

```
inspection-new-site-reset (c7d8e9f0-a1b2-4c3d-8e4f-5a6b7c8d9e0f): unit-tests — client reset and equipment visibility

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
