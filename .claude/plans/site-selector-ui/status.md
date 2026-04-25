# Status: site-selector-ui

**UUID**: `f47ac10b-58cc-4372-a567-0e02b2c3d479`  
**Task**: Create site selector component for inspection form  
**Orchestrator**: Claude (Sonnet 4.6)

---

## Phase Status Overview

| Phase | Status | Owner | Coverage | Notes |
|-------|--------|-------|----------|-------|
| Coding | pending | — | — | Implementation of SiteSelector component |
| Code Review | pending | — | — | Independent review, fresh session |
| Unit Tests | pending | — | — | Must achieve ≥90% coverage |
| UI Tests | pending | — | — | Playwright E2E tests |
| QA | pending | — | — | Automated verification & sign-off |

---

## Detailed Phase Information

### PHASE 1: Coding
- **Status**: `pending` ⏳ (waiting for orchestrator to spawn agent)
- **Owner**: (unassigned — waiting for Coding Agent)
- **Started**: —
- **Completed**: —
- **Branch**: `feature/site-selector-ui-coding`
- **Files to create/modify**:
  - `app/components/site-selector.tsx` (new)
  - `app/irrigation-form.tsx` (modify)
- **Success criteria**:
  - [ ] SiteSelector component implemented
  - [ ] IrrigationForm integrates component
  - [ ] `npm run build` passes
  - [ ] No TypeScript errors
  - [ ] Ready for Testing Agent

**Progress notes**:
(Agent updates this as they work)

---

### PHASE 1.5: Code Review
- **Status**: `pending` ⏳ (waiting for Coding phase complete)
- **Owner**: (unassigned — Code Review Agent, fresh session each cycle)
- **Started**: —
- **Completed**: —
- **Review Cycle**: — of 3
- **Model**: sonnet (always)
- **CODE_REVIEW.md**: `.claude/plans/site-selector-ui/CODE_REVIEW.md`
- **Success criteria**:
  - [ ] All AGENTS.md conventions verified
  - [ ] Multi-tenancy confirmed
  - [ ] No TypeScript `any` types
  - [ ] Security review clean
  - [ ] No blockers or major issues

**Progress notes**:
(Code Review Agent writes findings here)

---

### PHASE 2: Unit Tests
- **Status**: `pending` ⏳ (waiting for Code Review approved)
- **Owner**: (unassigned — waiting for Testing Agent)
- **Started**: —
- **Completed**: —
- **Coverage**: — (target: ≥90%)
- **Branch**: `feature/site-selector-ui-unit-tests`
- **Files to create/modify**:
  - `__tests__/site-selector.test.tsx` (new)
  - `__tests__/irrigation-form.test.tsx` (update)
- **Refactoring tasks** (if coverage < 90%):
  (Testing Agent will list here)

**Progress notes**:
(Agent updates this as they work)

---

### PHASE 3: UI Tests
- **Status**: `pending` ⏳ (waiting for Unit Tests phase complete)
- **Owner**: (unassigned — waiting for UI Test Agent)
- **Started**: —
- **Completed**: —
- **Branch**: (uses merged branches from Coding + Unit Tests)
- **Files to create/modify**:
  - `e2e/site-selector.spec.ts` (new Playwright tests)
- **Test coverage**:
  - [ ] Golden path: select existing site
  - [ ] Golden path: create new site
  - [ ] Mode switching
  - [ ] Search functionality
  - [ ] Accessibility (dark theme, keyboard nav)

**Progress notes**:
(Agent updates this as they work)

---

### PHASE 4: QA
- **Status**: `pending` ⏳ (waiting for UI Tests phase complete)
- **Owner**: (unassigned — waiting for QA Agent)
- **Started**: —
- **Completed**: —
- **Prerequisites**:
  - [ ] All branches merged to main
  - [ ] `npm run build` passes
  - [ ] `npm test` passes
  - [ ] `npx playwright test` passes
- **QA report location**: `QA_REPORT.md` (created during phase)

**Progress notes**:
(Agent updates this as they work)

---

## Questions Waiting for User Input

**None at this time.**

(If orchestrator has questions for user, they appear here with status: WAITING_FOR_USER_RESPONSE)

---

## Blockers & Issues

**Current blockers**: None

(Any blockers, issues, or escalations listed here with severity and resolution plan)

---

## Communication Log

**2026-04-25 14:00**: Task created by orchestrator. Waiting for user to start workflow.

(Agent status updates logged here periodically, every 15 minutes)

---

## Next Steps

1. User approves to start
2. Orchestrator spawns Coding Agent
3. Coding Agent implements feature
4. Orchestrator spawns Testing Agent
5. Testing Agent writes tests, ensures 90%+ coverage
6. (Loop: if coverage < 90%, send refactoring tasks to Coding Agent)
7. Orchestrator spawns UI Test Agent
8. UI Test Agent writes Playwright tests
9. Orchestrator spawns QA Agent
10. QA Agent verifies locally and signs off
11. Orchestrator asks user for final approval
12. Orchestrator commits and pushes
13. Task moved to `.claude/plans/completed/site-selector-ui/`

---

## Commit Strategy

**Commits by agent** (at end of each phase):
```
site-selector-ui (f47ac10b-...): coding - Implement SiteSelector component
site-selector-ui (f47ac10b-...): unit-tests - Add test suite (92% coverage)
site-selector-ui (f47ac10b-...): ui-tests - Add Playwright E2E tests
```

**Final commit by orchestrator** (after QA sign-off):
```
site-selector-ui (f47ac10b-...): Complete implementation

- SiteSelector component with search and mode toggle
- Integration with IrrigationForm
- Unit tests: 92% coverage
- Playwright E2E tests
- QA verification passed

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
(Use whichever model is running the orchestrator at commit time)
```

---

**Last Updated**: 2026-04-25 (task created)  
**Status Check Frequency**: Every 15 minutes during active work  
**Session Protection**: All status saved to prevent token/battery loss
