# Code Review: sites-menu-irrigation

**UUID**: c9e3a2f1-6b4d-4e8a-8f2c-1d7a9e5f3b8a
**Date**: 2026-04-25
**Review Cycle**: 2 of 3
**Reviewer Model**: claude-sonnet-4-6
**Overall Status**: APPROVED

---

## Summary

All three Cycle 1 major issues have been correctly resolved. The `updateSiteEquipmentSchema` now includes the `overview` object (staticPressure, backflowInstalled, backflowServiceable, isolationValve, systemNotes) as an optional field. The `SiteEquipmentEditor` renders a complete System Overview section with all five inputs, proper data-testid attributes, and passes overview state through to the server action. The `key={selectedSite.id}` prop is present on `SiteEquipmentEditor`, forcing remount on site switch. `updateSiteEquipmentCore` is correctly made private (no `export`). The build compiles cleanly and all 157 tests pass. The implementation correctly follows multi-tenancy rules, TypeScript strict conventions, and App Router architecture. One minor pre-existing issue noted (findSiteEquipment still exported) but it does not block.

---

## Findings

### BLOCKERS (must fix before proceeding)

None.

### MAJOR (must fix before proceeding)

None.

### MINOR (noted, does not block)

1. **[MINOR] `findSiteEquipment` remains exported from `'use server'` file**
   - File: `actions/sites.ts:247`
   - Note: The architecture decision in `context.md` states both `updateSiteEquipmentCore` and `findSiteEquipment` should be made private. `updateSiteEquipmentCore` was correctly made private in Cycle 1. `findSiteEquipment` is still exported. In Next.js, exported async functions in `'use server'` files are registered as callable Server Action endpoints. However, since `findSiteEquipment` requires a `dbClient` as its third argument (which can never be passed from a browser client), the practical security risk is minimal. The existing `__tests__/find-site-equipment.test.ts` from the `link-irrigation-fields` task imports it directly — making it private would require that test to be refactored. This is noted for future cleanup but does not block.

---

## Cycle 1 Fix Verification

| Fix | Status | Evidence |
|-----|--------|---------|
| System Overview in `updateSiteEquipmentSchema` | VERIFIED | `lib/validators.ts:142-154` — overview object with 5 fields, optional |
| System Overview persisted to `siteVisits` in action | VERIFIED | `actions/sites.ts:156-183` — upsert via onConflictDoUpdate on siteId+datePerformed |
| System Overview UI section in SiteEquipmentEditor | VERIFIED | `site-equipment-editor.tsx:176-238` — full section with 5 inputs and all overview data-testid attrs |
| `key={selectedSite.id}` on SiteEquipmentEditor | VERIFIED | `sites-page-client.tsx:65` |
| `updateSiteEquipmentCore` private (unexported) | VERIFIED | `actions/sites.ts:85` — `async function` with no `export` keyword |

---

## Checklist Results

| Category | Result | Notes |
|----------|--------|-------|
| Correctness | PASS | All 3 Cycle 1 fixes verified; overview flows UI → schema → action → DB; onConflictDoUpdate target matches DB unique constraint |
| Multi-tenancy | PASS | getRequiredCompanyId() first in updateSiteEquipment; site ownership verified before any mutation; all inserts include companyId |
| TypeScript | PASS | No any, no @ts-ignore, build compiles cleanly, 157 tests pass |
| Architecture | PASS | Named exports on all components; kebab-case files; verb-prefixed Server Actions; injectable core; page.tsx is Server Component |
| Testability | PASS | All 22 data-testid attributes present and match context.md spec including 6 overview section IDs |
| Security | PASS | Zod validates input at boundary; no user-controlled companyId in public action; no dangerouslySetInnerHTML |
| Code Quality | PASS | No console.log, no dead code, no commented-out code, clean state handlers |

---

## Decision

APPROVED: No blockers. No major issues. 1 minor noted (does not block).

Ready for Testing Agent.
