# Status: site-irrigation-refactor

**UUID**: `a1f2b3c4-d5e6-4f5a-8c7d-1e2f3a4b5c6d`

## Phase Tracking

### Coding Phase (Integration Checklist)
- **Status**: pending (waiting for all 3 subtasks complete)
- **Owner**: (unassigned)
- **Started**: —
- **Expected Completion**: —
- **Branch**: (no discrete branch — coordination task)
- **Notes**: Verify integration checklist, resolve blockers, ensure no regressions

### Code Review Phase (Integration Review)
- **Status**: pending (waiting for all 3 subtasks' coding complete)
- **Owner**: (unassigned — Code Review Agent, fresh session)
- **Started**: —
- **Review Cycle**: — of 3
- **CODE_REVIEW.md**: (created during phase)
- **Notes**: Reviews integration points across all 3 subtasks

### Unit Tests Phase (Integration Tests)
- **Status**: pending (waiting for code review approved)
- **Owner**: (unassigned)
- **Started**: —
- **Expected Completion**: —
- **Branch**: `feature/site-irrigation-integration-tests`
- **Notes**: End-to-end integration tests across all 3 tasks

### UI Tests Phase (End-to-End Workflows)
- **Status**: pending (waiting for all 3 subtasks complete)
- **Owner**: (unassigned)
- **Started**: —
- **Expected Completion**: —
- **Branch**: (uses merged feature branches)
- **Notes**: Full workflow testing (inspection + sites + equipment)

## Dependencies

- **Blocks**: (none)
- **Depends on**: 
  - `site-selector-ui` (all 3 phases)
  - `link-irrigation-fields` (all 3 phases)
  - `sites-menu-irrigation` (all 3 phases)

## Communication

**Coding Phase (Integration Checklist)**:
1. Wait until all 3 subtasks show `coding: completed`
2. Update **Owner**
3. Change **Status** to `in_progress`
4. Run integration checklist from `coding.md`
5. Resolve any blockers
6. Mark `completed` when checklist passes

**Unit Tests Phase (Integration Tests)**:
1. Wait until all 3 subtasks show `unit-tests: completed`
2. Update **Owner**
3. Change **Status** to `in_progress`
4. Checkout `main`, create branch `feature/site-irrigation-integration-tests`
5. Write integration tests per `unit-tests.md`
6. Commit and mark `completed`

**UI Tests Phase (End-to-End)**:
1. Wait until unit-tests phase `completed`
2. Update **Owner**
3. Change **Status** to `in_progress`
4. Launch dev server
5. Run full workflows from `ui-tests.md`
6. Document findings
7. Mark `completed`

## Blockers/Notes

### BLOCKER: Playwright E2E tests — Clerk auth error

**Status**: Needs investigation  
**Encountered**: 2026-04-25 (user ran `npx playwright test` manually)

**Error**:
```
[WebServer] Clerk: auth() was called but Clerk can't detect usage of clerkMiddleware().
```

**What we know**:
- `middleware.ts` EXISTS at the project root and correctly uses `clerkMiddleware()` + `createRouteMatcher`
- `.env.local` EXISTS (contains Clerk keys for normal dev)
- No `.env.test` file exists (only `.env.test.example` which only covers `DATABASE_URL_TEST`)
- `npm run build` ✅ passes
- `npm test` (271 unit tests) ✅ passes
- The Playwright dev server is started by `npx playwright test` using `reuseExistingServer: true` in config

**Hypotheses to investigate**:
1. `CLERK_SECRET_KEY` may not be loaded when Playwright starts its own dev server — check if `.env.local` is picked up by the Playwright webServer process
2. Version mismatch between `@clerk/nextjs` and `@clerk/testing` — check `package.json`
3. `setupClerkTestingToken` in `e2e/fixtures/auth.ts` may not be working — review the fixture
4. The `CLERK_SECRET_KEY` env var may need to be explicitly passed to the Playwright webServer command

**Investigation steps for next session**:
1. Check `package.json` for `@clerk/nextjs` and `@clerk/testing` versions
2. Check if `CLERK_SECRET_KEY` is in `.env.local`
3. Review `e2e/fixtures/auth.ts` — confirm `setupClerkTestingToken` is called
4. Try: `CLERK_SECRET_KEY=xxx npx playwright test` to confirm env is the issue
5. Check Clerk docs for E2E testing setup requirements

---

**Last Updated**: 2026-04-25 (Playwright blocker documented)
