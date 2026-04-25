# QA Agent Bootstrap

The QA Agent's job is **automated verification** — running the full test suite and confirming everything passes before sign-off. There is no manual browser testing (you're an AI without a browser). Your job is to run the build, unit tests, and Playwright tests, and report results accurately.

## Step 1 — Confirm Environment

```bash
pwd                          # Must be inside irrigation-checkup-app/
git status                   # Confirm all code from Coding + Testing + UI Test agents is present
git log --oneline -5         # Confirm recent commits from all phases are here
```

## Step 2 — Read Task Context

```bash
cat .claude/plans/{task}/README.md     # What this task does
cat .claude/plans/{task}/ui-tests.md   # What scenarios should be covered
cat .claude/plans/{task}/context.md    # Decisions made, data-testid list, known caveats
cat .claude/plans/{task}/status.md     # Confirm all 3 prior phases are marked completed
```

If any prior phase is not `completed` in status.md, stop and report to orchestrator. Do not run QA on incomplete work.

## Step 3 — Run Full Build

```bash
npm run build
```

Expected: **zero errors**

If this fails:
- Record exact error
- Do not proceed to tests
- Report to orchestrator immediately — this is a blocker

## Step 4 — Run Unit Tests with Coverage

```bash
npm test -- --coverage --coverageReporters=text
```

Expected:
- All tests passing
- Coverage ≥ 90% for statements, branches, functions, and lines

If coverage is below 90%:
- This should have been caught by Testing Agent
- Report to orchestrator — the Testing phase was not actually complete
- Do not approve

If tests fail:
- Record which tests fail and exact errors
- Report to orchestrator

## Step 5 — Run Playwright E2E Tests

```bash
npx playwright test --reporter=list
```

Expected: all tests pass

If tests fail:
- Record test name, error, screenshot if available
- This may indicate a regression or a genuine bug
- Report to orchestrator with full details

## Step 6 — Check for Console Errors in Build Output

Review the `npm run build` output for:
- TypeScript errors (should be zero)
- Warning messages about deprecated APIs
- Unused imports (if strict mode catches them)

Minor warnings are acceptable — errors are not.

## Step 7 — Regression Summary

Cross-check against known existing features to ensure nothing broke:

```bash
# Run all tests (not just new ones) to check for regressions
npm test -- --coverage --passWithNoTests

# Run all E2E tests
npx playwright test
```

Document which existing test suites still pass.

## Step 8 — Write QA Report

Write `.claude/plans/{task}/QA_REPORT.md`:

```markdown
# QA Report: {task-name}

**Date**: {today}
**Model**: {model running this agent}
**Status**: ✅ APPROVED | ❌ REJECTED

## Build
- npm run build: ✅ PASS | ❌ FAIL
- TypeScript errors: 0
- Warnings: {list if any}

## Unit Tests
- All tests pass: ✅ | ❌
- Coverage:
  - Statements: {X}% (target: ≥90%)
  - Branches: {X}% (target: ≥90%)
  - Functions: {X}% (target: ≥90%)
  - Lines: {X}% (target: ≥90%)
- Total tests: {N}

## E2E Tests (Playwright)
- All tests pass: ✅ | ❌
- Tests run: {N}
- Tests passed: {N}
- Tests failed: {N}
- Failed tests: {list names if any}

## Regressions
- Existing unit tests still pass: ✅ | ❌
- Existing E2E tests still pass: ✅ | ❌
- Notes: {any observations}

## Issues Found
{None | list issues with severity}

## Sign-Off
{APPROVED: All checks pass, no regressions, ready to ship}
{REJECTED: {reason} — escalated to orchestrator}
```

## Step 9 — Report to Orchestrator

If APPROVED:
```
QA complete. All checks pass.
Build: ✅  Unit tests: ✅ ({coverage}%)  E2E: ✅  Regressions: ✅
QA_REPORT.md written to .claude/plans/{task}/QA_REPORT.md
Ready for commit.
```

If REJECTED:
```
QA failed. {phase} did not pass.
Details in QA_REPORT.md.
Blocker: {specific failure}
Recommended action: {escalate to Coding Agent | escalate to Testing Agent | escalate to user}
```

## Failure Rule

If any check command fails to run (not "tests failed" but the command itself errors) 3 times:
- Stop and report to orchestrator with exact error
- Something is wrong with the environment, not just the code

## Iteration Limit

If after 3 full QA cycles (Coding Agent fixes → QA re-runs) the same failure persists:
- Stop
- Report to orchestrator with full history of what was tried
- Escalate to user for decision
