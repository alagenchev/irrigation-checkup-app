# UI Testing Instructions: site-irrigation-refactor

## Goal
Verify complete end-to-end workflows combining all three subtasks: site selection, equipment pre-fill, and equipment management.

## Testing Environment

**Prerequisites**:
- Dev server running: `npm run dev`
- Test sites with equipment (from Tasks 2-4)
- Logged in with test account

## Test Scenarios

### Scenario 1: Full Inspection Creation with Existing Site

**User Goal**: Create inspection for an existing site, use pre-filled equipment

**Steps**:
1. Open `/` (New Inspection)
2. Site selector appears (Task #1)
3. Search for "Acme HQ – Building A"
4. Click to select
5. Irrigation sections appear with pre-filled equipment (Task #2):
   - Controllers: show 2 existing controllers
   - Zones: show 3 existing zones with landscape/irrigation types
   - Backflows: show 2 existing backflow devices
   - Overview: show static pressure 65, checkboxes checked
6. Edit one zone: add "Shrubs" landscape type
7. Add new backflow
8. Change static pressure to 70
9. Fill remaining form fields (client, inspection type, etc.)
10. Save inspection
11. Verify inspection saved with edited equipment

**Expected Results**:
- [ ] Equipment pre-fills correctly
- [ ] User can edit and save
- [ ] Inspection persists changes
- [ ] No data corruption

### Scenario 2: Create New Site with Equipment During Inspection

**User Goal**: Create a new site with equipment without leaving the inspection form

**Steps**:
1. Open `/` (New Inspection)
2. Click "New Site" button (Task #1)
3. Enter site name: "New Project"
4. Enter address: "999 New Ave, Denver, CO"
5. Rest of form appears
6. Irrigation sections appear empty (Task #2)
7. Add 2 controllers
8. Add 4 zones
9. Add 1 backflow
10. Set static pressure to 60
11. Fill remaining form fields
12. Save inspection
13. Navigate to `/sites`
14. Verify new site appears in list with equipment intact (Task #3)
15. Click "Edit Equipment" on new site
16. Verify equipment displays correctly in editor

**Expected Results**:
- [ ] New site created with equipment
- [ ] Equipment appears in sites list
- [ ] Equipment editor shows correct data
- [ ] Full round-trip works

### Scenario 3: Edit Equipment from Sites Page, Use in New Inspection

**User Goal**: Update site equipment in sites page, then create inspection using updated data

**Steps**:
1. Navigate to `/sites` (Task #3)
2. Find "Acme HQ – Building A"
3. Click "Edit Equipment"
4. Equipment panel appears with existing data
5. Edit controller: change manufacturer from "Hunter" to "Rainbird"
6. Add new zone: "Side landscape"
7. Save changes
8. Close equipment editor
9. Navigate to `/` (New Inspection)
10. Site selector appears (Task #1)
11. Select "Acme HQ – Building A"
12. Verify equipment sections show updated data (Task #2):
    - Controllers show "Rainbird" (updated)
    - Zones show new "Side landscape" zone
    - All other data matches sites page
13. Save inspection with this equipment

**Expected Results**:
- [ ] Sites page edits persisted
- [ ] Inspection sees updated equipment
- [ ] No stale data in inspection

### Scenario 4: Edit Equipment in Inspection, Verify in Sites Page

**User Goal**: Modify equipment during inspection, see reflected in sites page

**Steps**:
1. Open `/` (New Inspection)
2. Select existing site "Acme HQ – Building B"
3. Equipment sections appear with pre-filled data
4. Edit a zone description
5. Save inspection (as a separate visit record, not modifying site equipment)
6. Navigate to `/sites`
7. Click "Edit Equipment" on "Acme HQ – Building B"
8. Verify equipment shows original values (inspection changes don't affect site equipment)
9. Go back to `/inspections` or inspection detail page
10. View the inspection just created
11. Verify its equipment shows the edits made during inspection

**Expected Results**:
- [ ] Inspection-level edits don't change site-level equipment
- [ ] Both work independently but harmoniously
- [ ] Visit-level data separate from site-level data

### Scenario 5: Rapid Mode Switching in Inspection

**User Goal**: Rapidly switch between existing/new site modes

**Steps**:
1. Open `/` (New Inspection)
2. Select site "Acme HQ – Building A" (Task #1)
3. Equipment loads (Task #2)
4. Click "New Site" button
5. Equipment sections clear (Task #2)
6. Type new site name and address
7. Click "Select Existing Site" button
8. Site selector returns, but previous equipment doesn't auto-load
9. Search and select different site "Green Valley Park"
10. Equipment loads for new site
11. Verify no data corruption or mixing between sites

**Expected Results**:
- [ ] Mode switching works without data loss
- [ ] Equipment isolated per site
- [ ] No cross-contamination between sites

### Scenario 6: Mobile/Responsive Workflow

**Device**: Tablet or mobile (DevTools emulation)

**Steps**:
1. Open `/` on mobile
2. Site selector appears and is usable
3. Tap to select site
4. Equipment sections appear below
5. Scroll through equipment sections
6. Equipment editor is visible and editable on mobile
7. Navigate to `/sites` on mobile
8. Sites table visible
9. Tap "Edit Equipment" on a site
10. Equipment editor appears (full screen or modal)
11. Edit and save works smoothly

**Expected Results**:
- [ ] All workflows work on mobile
- [ ] No horizontal scrolling
- [ ] Touch targets appropriately sized
- [ ] Responsive layout adapts

### Scenario 7: Dark Theme & Accessibility

**Steps**:
1. Open `/` and verify:
   - Site selector text readable (white on dark gray)
   - Equipment sections contrast meets WCAG AA
   - All controls have visible focus states
2. Use keyboard only:
   - Tab through site selection
   - Tab through equipment sections
   - Arrow keys navigate equipment lists
   - Enter selects/submits
3. Use screen reader (Mac VoiceOver or NVDA):
   - Form labels announced
   - Equipment sections labeled
   - Buttons and actions described
   - Errors announced

**Expected Results**:
- [ ] All colors accessible
- [ ] Keyboard navigation complete
- [ ] Screen reader compatible

### Scenario 8: Error Scenarios

**Scenario A: Network Fail During Equipment Load**
- [ ] Select site
- [ ] Equipment load fails (simulated network error)
- [ ] Error message shown
- [ ] User can retry or change site

**Scenario B: Concurrent Edits**
- [ ] User A edits equipment in sites page
- [ ] User B creates inspection with same site (before A's save)
- [ ] Both save successfully
- [ ] Verify no data loss or corruption

**Scenario C: Large Equipment Lists**
- [ ] Create site with 50+ zones
- [ ] Load in inspection form
- [ ] Load in sites page editor
- [ ] All display correctly
- [ ] Save completes in reasonable time

**Expected Results**:
- [ ] All error paths handled gracefully
- [ ] No data loss under stress
- [ ] Performance acceptable

## Sign-Off Checklist

- [ ] Scenario 1: New inspection with existing site pre-fill works
- [ ] Scenario 2: Create new site during inspection works
- [ ] Scenario 3: Sites page edits reflected in inspections
- [ ] Scenario 4: Inspection edits don't corrupt site equipment
- [ ] Scenario 5: Mode switching doesn't corrupt data
- [ ] Scenario 6: Mobile workflows work
- [ ] Scenario 7: Accessibility standards met
- [ ] Scenario 8: Error scenarios handled
- [ ] No visual glitches or layout issues
- [ ] Performance acceptable
- [ ] Ready for production

## Test Reporting

Document findings:
- Screenshots of key workflows
- Video of full end-to-end flow (if possible)
- Any bugs found (with reproduction steps)
- Performance metrics (load times, save times)
- Accessibility audit results

## Failure Handling

If any scenario fails:
1. Determine which subtask is responsible (Tasks #1, #2, or #3)
2. Document exact failure with steps and screenshot
3. File bug report with specific task and expected fix
4. Don't sign off until resolved
