# UI Testing Instructions: link-irrigation-fields

## Goal
Verify that selecting a site correctly loads and displays pre-filled equipment, and that the user can edit and save.

## Testing Environment

**Prerequisites**:
- Local dev server running: `npm run dev`
- App at `http://localhost:3000`
- Test site with pre-existing equipment created
- Test site with no equipment created (for edge case)

**Test Data to Create**:

**Site 1: "Acme HQ – Equipment"** (with equipment)
- Address: "123 Main St, Denver, CO"
- Controllers:
  - Controller #1: Location "Front", Manufacturer "Hunter", Model "Pro-HC", Sensors "Rain/Freeze", 8 zones
  - Controller #2: Location "Back", Manufacturer "Rainbird", Model "ST-2000", Sensors "Freeze", 6 zones
- Zones:
  - Zone 1: "Front lawn", Rotor, Full-sun turf, 8 photos
  - Zone 2: "Front landscape", Fan spray, High demand beds
  - Zone 3: "Back lawn", Rotor, Full-sun turf
- Backflows:
  - Backflow #1: Watts RPC 1"
  - Backflow #2: Anixter DCV 1.5"
- System Overview: Static pressure 65 PSI, Backflow installed, Isolation valve present, Notes "System in good condition"

**Site 2: "Green Valley – No Equipment"** (empty)
- Address: "456 Oak Ave, Boulder, CO"
- No equipment

## Test Cases

### Golden Path: Load Equipment from Existing Site

**Steps**:
1. Open `/` (New Inspection)
2. Site selector appears
3. Search for "Acme HQ – Equipment"
4. Click to select
5. Verify loading state appears briefly
6. Verify irrigation sections appear
7. Verify controllers section shows:
   - Both controllers with correct details
   - Controller count matches (2)
8. Verify zones section shows:
   - All 3 zones with correct descriptions
   - Landscape types checked correctly (Full-sun turf, High demand beds)
   - Irrigation types checked correctly (Rotor, Fan spray)
9. Verify backflows section shows:
   - Both backflows with correct manufacturer, type, model, size
10. Verify system overview shows:
    - Static pressure: "65"
    - Checkboxes: Backflow Installed ✓, Isolation Valve ✓
    - Notes: "System in good condition"

**Expected Results**:
- [ ] Loading state visible (0.5-2 seconds)
- [ ] All sections appear (not hidden)
- [ ] All equipment data displays correctly
- [ ] No truncation or display issues
- [ ] Data is accurate (not swapped or missing)

### Golden Path: New Site Mode (No Pre-fill)

**Steps**:
1. Open `/` (New Inspection)
2. Click "New Site" button
3. Enter site name and address
4. Verify irrigation sections appear
5. Verify all equipment arrays are empty:
   - Controllers: Default 0 or empty
   - Zones: Default empty
   - Backflows: Default empty
6. Verify system overview fields are default values:
   - Static pressure: empty
   - All checkboxes: unchecked
   - Notes: empty
7. Fill in controllers, zones, backflows manually
8. Save inspection
9. Verify site is created with entered equipment

**Expected Results**:
- [ ] New site mode shows empty equipment sections
- [ ] User can add controllers/zones/backflows
- [ ] Save works normally
- [ ] Site is created with equipment

### Edge Case: Site with No Equipment

**Steps**:
1. Open `/` (New Inspection)
2. Search and select "Green Valley – No Equipment"
3. Verify loading state appears
4. Verify irrigation sections appear
5. Verify controllers section is empty or shows "Add Controller" option
6. Verify zones section is empty or shows "Add Zone" option
7. Verify backflows section is empty or shows "Add Backflow" option
8. Verify system overview fields are all defaults/empty

**Expected Results**:
- [ ] Empty equipment is handled gracefully
- [ ] User can add new equipment from empty state
- [ ] No error messages
- [ ] Sections don't collapse or hide

### Editing Pre-filled Equipment

**Steps**:
1. Load site with equipment (Acme HQ)
2. All equipment pre-filled
3. Modify a controller: Change "Hunter" to "Orbit"
4. Modify a zone: Add "Shrubs" landscape type
5. Remove a backflow
6. Change system pressure from "65" to "70"
7. Save inspection
8. Reload page or navigate away and back
9. Create new inspection, select same site
10. Verify original equipment is unchanged (not double-saved)

**Expected Results**:
- [ ] Edits don't affect original site equipment
- [ ] Inspection saves with modifications
- [ ] Reloading shows new inspection with modifications
- [ ] Re-selecting site loads original unmodified equipment

### Performance & Loading

**Steps**:
1. Open `/`
2. Select site with large amount of equipment (20+ controllers, 50+ zones)
3. Measure load time
4. Verify no freezing or lag

**Expected Results**:
- [ ] Load time < 2 seconds
- [ ] UI responsive (no frame drops)
- [ ] Scrolling through large lists is smooth

### Error Handling

**Scenario 1: Network Error During Load**
- [ ] Simulate network failure (DevTools throttle, or temporary DB issue)
- [ ] Select a site
- [ ] Verify error message appears: "Error loading equipment: ..."
- [ ] User is not blocked (can still fill other form fields or try again)

**Scenario 2: Site Deleted After Selection**
- [ ] Select site
- [ ] Site is deleted from DB (via another session)
- [ ] Attempt to load equipment
- [ ] Verify graceful error handling

**Expected Results**:
- [ ] Errors are shown clearly
- [ ] User can retry or switch to different site
- [ ] Form doesn't crash

### Accessibility Check

**Keyboard Navigation**:
- [ ] Tab through form, including irrigation sections
- [ ] Arrow keys navigate equipment lists (if applicable)
- [ ] Can edit equipment fields via keyboard

**Screen Reader**:
- [ ] Loading state is announced: "Loading equipment..."
- [ ] Error messages are announced
- [ ] Equipment sections are labeled properly
- [ ] Equipment counts are announced (e.g., "2 controllers")

**Dark Theme**:
- [ ] All equipment text is readable
- [ ] Colors meet contrast requirements
- [ ] Focus states are visible

**Expected Results**:
- [ ] All keyboard/screen reader navigation works
- [ ] Colors meet WCAG AA contrast requirements

### Visual Regression

**Screenshots to Capture**:
- [ ] Equipment sections when hidden (placeholder state)
- [ ] Equipment sections when loading
- [ ] Equipment sections fully loaded with data
- [ ] Empty equipment sections (no equipment on site)
- [ ] Error state
- [ ] Mobile view (if applicable)

## Sign-Off Checklist

- [ ] All golden path tests pass
- [ ] Equipment pre-fill works correctly
- [ ] Empty equipment is handled gracefully
- [ ] Edits don't affect original site data
- [ ] Performance is acceptable
- [ ] Error handling works
- [ ] Accessibility meets standards
- [ ] No visual glitches
- [ ] Ready for production

## Failure Handling

If any test fails:
1. Document failure (screenshots, exact steps, expected vs. actual)
2. Determine if it's:
   - **Data issue**: Equipment not loading correctly
   - **UI issue**: Display glitch or missing sections
   - **Performance issue**: Too slow to load
   - **Accessibility issue**: Contrast or keyboard navigation
3. File bug for developer or QA team
4. Don't sign off until resolved
