# Status: auto-select-single-inspector

**UUID**: `d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a`

## Phase Tracking

### Coding Phase
- **Status**: pending
- **Owner**: (unassigned)
- **Started**: —
- **Branch**: `feature/auto-select-single-inspector`
- **Notes**: Two edits to `app/irrigation-form.tsx` only — no schema, no new files

### Code Review Phase
- **Status**: pending (waiting for coding complete)
- **Owner**: (unassigned — Code Review Agent, fresh session)
- **Started**: —
- **Review Cycle**: — of 3
- **CODE_REVIEW.md**: (created during phase)

### Unit Tests Phase
- **Status**: pending (waiting for code review approved)
- **Owner**: (unassigned)
- **Started**: —
- **Branch**: `feature/auto-select-single-inspector` (same branch)

### UI Tests Phase
- **Status**: pending (waiting for unit tests complete)
- **Owner**: (unassigned)
- **Started**: —

## Dependencies

- **Blocks**: (none)
- **Depends on**: (none)
- **Note**: Overlaps with `remove-performed-by` (`e3f4a5b6-...`) — that task also mentioned auto-select. When `remove-performed-by` is picked up, remove the auto-select bullet from its scope.

## Communication

**Coding Phase**:
1. Read `coding.md` — two edits only, no new files
2. Create branch `feature/auto-select-single-inspector`
3. Edit `form` `useState` initialiser (Change 1) and inspector JSX section (Change 2)
4. Run `npm run build && npm test` — both must pass
5. Commit with task name + UUID in message
6. Update **Owner** and **Status** here → mark `completed`

**Code Review Phase**:
1. Fresh session — diff is tiny (~15 lines changed)
2. Check: no dropdown rendered when `inspectors.length === 1`, correct static text style, `initialData` path untouched
3. Create `CODE_REVIEW.md`; block only on BLOCKER/MAJOR
4. Mark `completed` when approved

**Unit Tests Phase**:
1. Read `unit-tests.md` — add `describe` block to `__tests__/irrigation-form.test.tsx`
2. Cover 0-, 1-, 2+-inspector and edit-mode cases
3. Run `npm test -- --testPathPattern="irrigation-form"` — all must pass
4. Mark `completed`

**UI Tests Phase**:
1. Read `ui-tests.md` — add `e2e/auto-select-single-inspector.spec.ts`
2. Run Playwright tests; complete manual smoke tests; document results here
3. Mark `completed`

## Blockers / Notes

(none)

**Last Updated**: 2026-04-26 (task created)
