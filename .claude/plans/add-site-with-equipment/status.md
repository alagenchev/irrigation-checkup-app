# Status: add-site-with-equipment

**UUID**: `f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c`

## Phase Tracking

### Coding Phase
- **Status**: pending
- **Owner**: (unassigned)
- **Branch**: `feature/add-site-with-equipment`
- **Notes**: One file changed — `app/sites/add-site-form.tsx`. Replace `useActionState` with controlled state; add two-phase render. See `coding.md` for the full implementation.

### Code Review Phase
- **Status**: pending (waiting for coding complete)
- **Owner**: (unassigned — Code Review Agent, fresh session)
- **Review Cycle**: — of 3
- **CODE_REVIEW.md**: (created during phase)

### Unit Tests Phase
- **Status**: pending (waiting for code review approved)
- **Owner**: (unassigned)
- **Branch**: `feature/add-site-with-equipment` (same branch)
- **New file**: `__tests__/add-site-form.test.tsx`

### UI Tests Phase
- **Status**: pending (waiting for unit tests complete)
- **Owner**: (unassigned)
- **New file**: `e2e/tests/10-add-site-with-equipment.spec.ts`

## Dependencies

- **Blocks**: (none)
- **Depends on**: `sites-menu-irrigation` (`c9e3a2f1-...`) — `SiteEquipmentEditor` must be implemented

## Communication

**Coding Phase**:
1. Confirm `SiteEquipmentEditor` exists at `app/sites/site-equipment-editor.tsx`
2. Create branch `feature/add-site-with-equipment`
3. Rewrite `app/sites/add-site-form.tsx` per `coding.md` — keep exported name and props identical
4. `npm run build && npm test` — both must pass
5. Commit, update Owner + Status, mark `completed`

**Code Review Phase**:
1. Fresh session — diff is small (~60 lines net change in one file)
2. Key things to check: `SiteWithClient` constructed correctly, `handleDone` resets all state, `createSite(null, fd)` call is correct, no `useActionState` remnants
3. Create `CODE_REVIEW.md`; block only on BLOCKER/MAJOR
4. Mark `completed` when approved

**Unit Tests Phase**:
1. Read `unit-tests.md` — create `__tests__/add-site-form.test.tsx`
2. Use `userEvent` for interactions (not `fireEvent`)
3. `npm test -- --testPathPattern="add-site-form"` — all must pass
4. Mark `completed`

**UI Tests Phase**:
1. Read `ui-tests.md` — create `e2e/tests/10-add-site-with-equipment.spec.ts`
2. Run `npx playwright test e2e/tests/10-add-site-with-equipment.spec.ts`
3. Complete manual visual checks and document results here
4. Mark `completed`

## Blockers / Notes

(none)

**Last Updated**: 2026-04-26 (task created)
