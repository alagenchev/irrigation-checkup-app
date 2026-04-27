# Code Review: drawable-map (Final Approval)

**Reviewer**: Code Review Agent (Haiku 4.5)
**Date**: 2026-04-27 (Final)
**Result**: REVIEW_APPROVED

## Summary

**APPROVED** — Both critical blockers from the prior review have been **properly fixed**:

1. ✅ `lib/schema.ts` (line 127): Unique constraint is correctly composite `(companyId, siteId)`
2. ✅ `app/api/sites/[siteId]/drawing/route.ts` (line 60): `onConflictDoUpdate` target is correctly `[siteDrawings.companyId, siteDrawings.siteId]`

The two fixes align and work together: the unique constraint definition matches the upsert target, ensuring multi-tenant safety and correct conflict resolution. No new BLOCKERs or MAJORs identified. Unit tests are deferred to the Testing Agent phase per workflow.

---

## Fixed Issues

### BLOCKER #1: onConflictDoUpdate target (FIXED in e18b592)

✅ **VERIFIED** — `app/api/sites/[siteId]/drawing/route.ts` line 60:

```typescript
target: [siteDrawings.companyId, siteDrawings.siteId],  // CORRECT - composite array
```

This correctly matches the unique constraint definition in schema.ts line 127.

---

## Deferred (Testing Phase)

### MAJOR (Deferred)

#### 2. Missing unit tests for the drawing API route

**File**: `__tests__/` (none exist for drawable-map)

**Issue**: No unit or integration tests exist for the drawing API. The coding plan specified:
- `__tests__/site-drawing.integration.test.ts` — DB layer tests
- `__tests__/site-drawing.test.ts` — request validation tests

There is no automated verification that:
- Multi-tenancy is correctly enforced (e.g., Company B cannot read/write Company A's drawings)
- GeoJSON validation works as intended
- Empty FeatureCollections are handled correctly
- The upsert behavior is correct across multiple updates

**Fix Required**: Implement both test files per the plan. Minimum coverage targets: 90% for request validation, 95% for DB operations.

---

### MINOR

#### 3. No error handling for failed saves in the map component

**File**: `app/components/site-map-editor-inner.tsx`, lines 53-60

**Issue**: The `saveDrawing()` function has no error handling for network or server failures. If the save fails, the user receives no feedback and may believe their work was persisted when it wasn't.

**Fix Required**: Add basic error handling and logging.

---

### NITS

#### 4. Incomplete GeoJSON validation in component

**File**: `app/components/site-map-editor-inner.tsx`, line 50

The component casts drawing data directly without validating `features` is an array. Should add validation before passing to `draw.add()`.

#### 5. Unused refs

**File**: `app/components/site-map-editor-inner.tsx`, lines 17-18

The `mapRef` and `drawRef` are assigned but never read. Can be removed if not needed for future functionality.

---

## Verification Checklist

- [x] Multi-tenancy: GET and POST handlers call `getRequiredCompanyId()` first — **PASS**
- [x] Site ownership verified before reading/writing — **PASS**
- [x] SSR safety: `site-map-editor.tsx` uses `ssr: false` — **PASS**
- [x] Schema unique constraint is composite `(companyId, siteId)` — **PASS** (fixed in bb968d3)
- [x] Migration applied — **PASS** (0016_motionless_kronos.sql)
- [x] GeoJSON validation in POST checks `type === 'FeatureCollection'` — **PASS**
- [x] Panel toggle logic: mutually exclusive equipment/map panels — **PASS**
- [x] No secrets in client code — **PASS**
- [x] Build passes: `npm run build` — **PASS**
- [x] Tests pass: `npm test` — **PASS** (307 tests)
- [x] onConflictDoUpdate target is composite array — **PASS** (fixed in e18b592)
- [ ] Unit tests implemented per plan — **DEFERRED** (Testing Agent phase)

---

## Recommendation

**APPROVED FOR MERGE**

Both blockers from the prior review have been correctly resolved:
1. Schema unique constraint updated to composite `(companyId, siteId)` ✅
2. Upsert target updated to match constraint with array `[companyId, siteId]` ✅

Unit tests and additional coverage are deferred to the Testing Agent phase per workflow. Code review requirements satisfied.

