# Code Review: add-site-with-equipment

**UUID**: `f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c`

**Date**: 2026-04-27

**Review Cycle**: 1 of 3

**Reviewer Model**: claude-haiku-4-5-20251001

**Overall Status**: ✅ APPROVED

---

## Summary

The task implements a two-phase form flow for site creation and equipment editing. `AddSiteForm` is refactored from `useActionState` to controlled `useState`, transitioning from phase 1 (site creation) to phase 2 (equipment editor) after successful site creation. The implementation correctly handles form state, error messaging, reset behavior, and integrates cleanly with the existing `SiteEquipmentEditor` component. Multi-tenancy is properly delegated to the `createSite()` server action. Build passes, all 301 tests pass (including 14 new unit tests), and E2E coverage is comprehensive. No blockers or major issues identified.

---

## Findings

### BLOCKERS (must fix before proceeding)

*None.*

### MAJOR (must fix before proceeding)

*None.*

### MINOR (noted, does not block)

1. **[MINOR] E2E test on line 86 may have a race condition**
   - File: `e2e/tests/10-add-site-with-equipment.spec.ts:84-87`
   - Issue: The test "shows a validation error if site name is blank" tries to click the button without filling the required site name field. The button is disabled by the `required` HTML attribute, so the click does not submit the form. The test then waits for `add-site-equipment-phase` to NOT be visible with a 2-second timeout. If the page is slow, the timeout may pass without confirming the validation actually fired. The test passes because no equipment phase appeared, but for the wrong reason (button disabled, not validation).
   - Note: This is not a functional bug — the form cannot submit without the site name due to the HTML5 `required` attribute. The test assertion is just indirect. Consider clarifying the test intent by either checking for the form's HTML5 validation UI or filling the name and then clearing it.

---

## Checklist Results

| Category | Result | Notes |
|----------|--------|-------|
| Correctness | ✅ | Implementation matches spec exactly. Two-phase flow works. Form state properly controlled. |
| Multi-tenancy | ✅ | `createSite()` calls `getRequiredCompanyId()` at top. No tenant data leaks. Form is thin wrapper. |
| TypeScript | ✅ | Strict types throughout. `SiteWithClient` imported and used correctly. No `any` types. |
| Architecture | ✅ | Named export, kebab-case filename. Server Action is thin wrapper. Dependency injection correct. |
| Testability | ✅ | Core logic is `handleSubmit()` and `handleDone()` — injectable via component props (implicitly tested). Unit tests cover both phases, error paths. E2E tests cover happy path + edge cases. |
| Security | ✅ | FormData constructed safely from form inputs. No hardcoded secrets. Zod validation in `createSite()`. No XSS risk. |
| Code Quality | ✅ | No dead code. No overly deep nesting. No console.log. No commented-out code. Clear intent. |

---

## Decision

✅ **APPROVED** — No blockers or major issues. Ready for Testing Agent.

One minor observation on E2E test clarity (line 84-87) noted above, but does not affect functionality or correctness.
