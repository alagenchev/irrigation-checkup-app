# Unit Test Instructions: drawable-map

## Goal

Test the API route handlers for site drawing storage. The Mapbox map component itself cannot be unit-tested (it requires a DOM and browser APIs) — it is covered by the UI tests instead.

---

## Prerequisites

- Coding phase (`coding.md`) must be complete
- `siteDrawings` table must be migrated
- Run: `npm run test:db` to confirm DB integration suite still passes before adding new tests

---

## Test Files

### 1. `__tests__/site-drawing.integration.test.ts`

Test the route handler logic end-to-end using the real test database.

Because Next.js route handlers use `Request`/`Response` (Web API), test the underlying DB logic directly — import the same helper functions used inside the route, or extract pure `getDrawing` / `upsertDrawing` functions from the route file and test those.

If the route logic is not extracted into helpers, test it via direct DB calls to verify the schema works and write the route-level tests as light integration checks using `fetch` against a running test server (simpler: just test DB operations directly).

**Setup pattern** (matches existing integration tests in this project):

```ts
import { db } from '@/lib/db'
import { companies, sites, siteDrawings } from '@/lib/schema'
import { withRollback } from '@/test/helpers/db'

jest.mock('@/lib/tenant', () => ({
  getRequiredCompanyId: jest.fn().mockResolvedValue(TEST_COMPANY_ID),
}))
```

**Test cases**:

```
describe('site drawing — database layer', () => {

  describe('GET drawing', () => {
    ✓ returns null when no drawing exists for a site
    ✓ returns the stored GeoJSON FeatureCollection after a save
    ✓ only returns drawing for the correct siteId (not a different site)
  })

  describe('POST drawing (upsert)', () => {
    ✓ inserts a new drawing when none exists
    ✓ replaces (upserts) an existing drawing when called again for the same site
    ✓ stores the GeoJSON exactly as provided — no transformation
    ✓ stores companyId alongside the drawing
    ✓ updates updatedAt on every upsert
  })

  describe('multi-tenancy enforcement', () => {
    ✓ cannot read a drawing for a site belonging to a different company
    ✓ cannot write a drawing for a site belonging to a different company
    ✓ site ownership check: site not found → returns 404 / throws
  })

  describe('GeoJSON content', () => {
    ✓ stores a FeatureCollection with polygon features correctly
    ✓ stores a FeatureCollection with line features correctly
    ✓ stores a FeatureCollection with point features correctly
    ✓ stores an empty FeatureCollection (no features) correctly
    ✓ stores a FeatureCollection with mixed geometry types correctly
  })

})
```

**Example GeoJSON fixtures**:

```ts
const EMPTY_FEATURE_COLLECTION = { type: 'FeatureCollection', features: [] }

const POLYGON_FEATURE_COLLECTION = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[[-118.4, 34.0], [-118.3, 34.0], [-118.3, 33.9], [-118.4, 33.9], [-118.4, 34.0]]],
    },
  }],
}

const LINE_FEATURE_COLLECTION = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [[-118.4, 34.0], [-118.3, 33.9]],
    },
  }],
}
```

---

### 2. Route handler validation tests (if route has request parsing logic)

If the POST handler validates the request body before inserting (it checks `type === 'FeatureCollection'`), add a unit test for that validation path using mocked DB:

**File**: `__tests__/site-drawing.test.ts`

```ts
describe('POST /api/sites/[siteId]/drawing — request validation', () => {
  ✓ rejects a non-object body with 400
  ✓ rejects a GeoJSON type that is not FeatureCollection (e.g. "Feature") with 400
  ✓ rejects malformed JSON with 400
  ✓ accepts a valid FeatureCollection and calls upsert
})
```

Mock pattern:
```ts
jest.mock('@/lib/db', () => ({ db: { insert: jest.fn(...) } }))
jest.mock('@/lib/tenant', () => ({ getRequiredCompanyId: jest.fn().mockResolvedValue('test-company-id') }))
```

---

## Coverage Targets

| Target | Coverage |
|---|---|
| Drawing DB operations (get + upsert) | >95% |
| Multi-tenancy guard in route | >95% |
| POST request validation | >90% |

---

## Isolation Rules

- Use `withRollback()` for every integration test that writes to the DB
- Never share state between tests
- Each test creates its own test site within the test company

---

## Running Tests

```bash
npm test              # unit tests only (no DB) — for request validation tests
npm run test:db       # integration tests with real DB — for drawing storage tests
```

All tests must pass before committing.

---

## Success Criteria

- [ ] All test cases listed above implemented and passing
- [ ] `withRollback()` isolation used for all integration tests
- [ ] No DB state leaks between tests
- [ ] Coverage targets met
- [ ] `npm test` and `npm run test:db` both pass clean
