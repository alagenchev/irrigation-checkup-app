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

(Add any integration issues, regressions, or notes here as work progresses)

---

**Last Updated**: 2026-04-25 (task created)
