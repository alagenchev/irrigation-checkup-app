# Coding Instructions: site-irrigation-refactor

## Goal
Coordinate and verify integration of three subtasks that together refactor site and irrigation data management.

## This is a Coordination Task

This task has **no discrete code implementation**. Instead:
- Track completion of three subtasks
- Verify they integrate without conflicts
- Ensure no regressions
- Resolve any blockers between subtasks

## Subtasks

### 1. site-selector-ui (f47ac10b-58cc-4372-a567-0e02b2c3d479)
**Status**: Pending
**Owner**: Backend/UI developer

**Deliverables**:
- [ ] SiteSelector component created
- [ ] IrrigationForm integrates SiteSelector
- [ ] Existing/new site modes work
- [ ] Coding complete and tests passing

### 2. link-irrigation-fields (8f5d8c1a-7b2e-4f3a-9c6d-2e1a5f8b3c2d)
**Status**: Pending (depends on #1)
**Owner**: Backend/API developer

**Deliverables**:
- [ ] `getSiteEquipment` server action created
- [ ] IrrigationForm loads equipment on site selection
- [ ] Irrigation sections conditionally visible
- [ ] Pre-fill works correctly
- [ ] Coding complete and tests passing

### 3. sites-menu-irrigation (c9e3a2f1-6b4d-4e8a-8f2c-1d7a9e5f3b8a)
**Status**: Pending (independent, can run parallel to #2)
**Owner**: Backend/UI developer

**Deliverables**:
- [ ] `updateSiteEquipment` server action created
- [ ] SiteEquipmentEditor component created
- [ ] SitesPage integrates equipment editor
- [ ] Edit/save workflow works
- [ ] Coding complete and tests passing

## Integration Checklist

After all three subtasks are complete, verify:

### Data Consistency
- [ ] Equipment created via inspection #2 matches equipment viewed in sites page #3
- [ ] Equipment edited in sites page #3 loads correctly in new inspections #2
- [ ] No duplicate equipment created on save
- [ ] Multi-tenancy filters work across all three contexts

### Server Actions
- [ ] `getSiteEquipment` (Task #2) returns correctly formatted data for Task #3 to consume
- [ ] `updateSiteEquipment` (Task #3) persists equipment correctly for Task #2 to load

### UI Integration
- [ ] SiteSelector (Task #1) works with conditional irrigation rendering (Task #2)
- [ ] Site selection in inspection matches site selection UX on sites page (Task #3)
- [ ] Dark theme colors consistent across all new components

### Form State
- [ ] Equipment loaded from Task #2 can be edited and saved to Task #3
- [ ] Equipment edited in Task #3 doesn't interfere with inspection creation in Task #1/2
- [ ] Form state preserved across mode/site changes

### Type Safety
- [ ] No TypeScript errors after merging all branches
- [ ] All server action types match expected inputs/outputs
- [ ] Form data types consistent across all three contexts

### Database
- [ ] No accidental data loss during equipment saves
- [ ] Migrations (if any) are backwards compatible
- [ ] Test data fixtures work across all three features

## Blocker Resolution

If integration issues arise:

**If Task #1 is blocked**:
- May block Tasks #2 and #3
- Escalate early

**If Task #2 is blocked**:
- Task #3 can proceed (independent)
- Task #1 must be complete first

**If Task #3 is blocked**:
- Tasks #1 and #2 can proceed
- Doesn't block Task #2

**Resolution Process**:
1. Document the blocker
2. Assign to appropriate owner
3. Create sub-task if needed
4. Update status in master task list
5. Resume blocked task when resolved

## Post-Implementation

Once all three subtasks are complete and integrated:

### Documentation
- [ ] Update README or feature docs to explain new site/equipment workflow
- [ ] Add inline comments explaining equipment loading/saving patterns
- [ ] Document the `getSiteEquipment` and `updateSiteEquipment` APIs

### Code Quality
- [ ] No console.log or debug code left behind
- [ ] No unused imports or variables
- [ ] Consistent code style across all three subtasks

### Testing Coverage
- [ ] Unit tests passing (all three subtasks)
- [ ] Integration tests passing
- [ ] UI tests documented and passing
- [ ] Overall coverage >90%

### Performance
- [ ] Equipment loading <1 second
- [ ] Equipment save <2 seconds
- [ ] No N+1 query issues
- [ ] Large equipment lists (50+ zones) handled efficiently

### Accessibility
- [ ] WCAG AA contrast ratios met
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Mobile responsive (if applicable)

## Sign-Off Criteria

This task is complete when:
- [ ] All three subtasks show `coding: completed, unit-tests: completed, ui-tests: completed`
- [ ] Integration checklist passed
- [ ] No blockers or regressions
- [ ] All post-implementation checks passed
- [ ] Code merged to main branch
- [ ] Documentation updated

## Timeline & Dependencies

```
Parallel Work:
├── site-selector-ui (Task #1)
│   └── start: now
│       end: ~2-3 days
│
├── link-irrigation-fields (Task #2)
│   └── start: after Task #1 complete
│       end: ~3-4 days
│
└── sites-menu-irrigation (Task #3)
    └── start: anytime (independent of Task #2)
        end: ~3-4 days

Integration & Sign-Off: After all three complete (~9-11 days total)
```

## Files Not Modified by This Task

This coordination task doesn't own implementation files. See individual subtask coding.md for file lists.

## Success Metrics

- Zero regressions in existing inspection/site functionality
- All three subtasks integrated without conflicts
- All tests passing (unit, integration, UI)
- Production-ready code quality
