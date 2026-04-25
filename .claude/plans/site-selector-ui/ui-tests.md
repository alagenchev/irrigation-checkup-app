# UI Testing Instructions: site-selector-ui

## Goal
Verify that the site selector works correctly in the real application, with proper UX, accessibility, visual design, and form integration.

## Testing Environment

**Prerequisites**:
- Local dev server running: `npm run dev`
- App accessible at `http://localhost:3000`
- Database populated with test sites (see below)
- Logged in to a test company account

**Test Sites to Create** (via `/sites` page or directly):
1. Site: "Acme HQ – Building A", Address: "123 Main St, Denver, CO", Client: "Acme Corp"
2. Site: "Acme HQ – Building B", Address: "125 Main St, Denver, CO", Client: "Acme Corp"
3. Site: "Green Valley Park", Address: "456 Oak Ave, Boulder, CO", Client: "Parks Dept"
4. Site: "Tech Campus – North", Address: "789 Tech Ln, Fort Collins, CO", Client: "TechCorp"
5. Site: "Tech Campus – South", Address: "790 Tech Ln, Fort Collins, CO", Client: "TechCorp"

## Test Cases

### Golden Path: Select Existing Site

**Steps**:
1. Open `/` (New Inspection page)
2. Site selector appears at top with "Select Existing Site" mode
3. Click on the site autocomplete field
4. Type "Acme"
5. Verify dropdown shows both "Acme HQ" buildings
6. Click "Acme HQ – Building A"
7. Verify `siteName` field populates with "Acme HQ – Building A"
8. Verify `siteAddress` field populates with "123 Main St, Denver, CO"
9. Continue filling form and save
10. Verify site is selected correctly in saved inspection

**Expected Results**:
- [ ] Dropdown appears with correct results
- [ ] Site data populates correctly
- [ ] No lag or UI jank during search
- [ ] Can continue to next form sections without issue

### Golden Path: Create New Site

**Steps**:
1. Open `/` (New Inspection page)
2. Site selector shows "Select Existing Site" mode
3. Click "New Site" button
4. UI switches to show two text inputs: Site Name and Address
5. Type "New Test Site" in name field
6. Type "999 Test St, Denver, CO" in address field
7. Verify fields are editable and accept input
8. Continue filling form and save
9. Verify new site is created and inspection is saved

**Expected Results**:
- [ ] Mode switches cleanly to new site inputs
- [ ] Text fields accept free-form input
- [ ] Can save inspection with new site info
- [ ] New site appears in Sites list afterwards

### Golden Path: Switch Modes

**Steps**:
1. Open `/` (New Inspection page)
2. Click "New Site" to switch to new mode
3. Enter "Draft Site Name" in the name field
4. Click "Select Existing Site" to switch back
5. Verify site selector returns to existing mode
6. Verify search/select works normally

**Expected Results**:
- [ ] Mode toggle is easy to find
- [ ] Switching modes updates UI immediately
- [ ] Can toggle back and forth without data loss (for that mode)

### Search Functionality

**Test Case 1: Search by Site Name**
- Open form, search field focused
- Type "Green Valley"
- Verify only "Green Valley Park" appears
- Click to select
- Verify correct site data populates

**Test Case 2: Search by Address**
- Type "Main St"
- Verify both "Acme HQ" buildings appear (both have "Main St" address)
- Type "123 Main"
- Verify only Building A appears
- Click to select

**Test Case 3: Search by Client Name**
- Type "TechCorp"
- Verify both "Tech Campus" sites appear
- Results show client name for disambiguation

**Test Case 4: Partial Match**
- Type "Acme" (no "HQ" or full name)
- Verify both Acme sites appear
- Type "HQ B" (partial match)
- Verify only Building B appears

**Test Case 5: No Results**
- Type "xyz123"
- Verify "No results" or empty state message appears
- Verify can clear search and try again

**Expected Results**:
- [ ] All search variations work correctly
- [ ] Results update as user types (no lag >500ms)
- [ ] Case-insensitive matching works
- [ ] Partial matching works

### Accessibility Testing

**Dark Theme & Contrast**
- [ ] Site selector text is readable on dark background (white on dark gray, not black on dark)
- [ ] Dropdown text is visible (check #ffffff or #f4f4f5 on #1c1c1e background)
- [ ] Focus states are visible (outline or highlight visible)
- [ ] Color contrast ratio >= 4.5:1 (per AGENTS.md UI rules)

**Keyboard Navigation**
- [ ] Tab key moves focus to site search field
- [ ] Type to search (autocomplete responds)
- [ ] Arrow Down/Up keys navigate dropdown results
- [ ] Enter key selects highlighted result
- [ ] Escape key closes dropdown
- [ ] Tab continues to next form field
- [ ] Shift+Tab goes to previous field

**Screen Reader** (NVDA, JAWS, or VoiceOver on Mac)
- [ ] Form label is announced: "Select existing site" or similar
- [ ] Dropdown results are announced as they appear/change
- [ ] Selected site is announced clearly
- [ ] Mode toggle button purpose is announced
- [ ] Error states (if any) are announced

**Expected Results**:
- [ ] All keyboard shortcuts work
- [ ] All dark theme colors meet contrast requirements
- [ ] Screen reader can navigate and select sites

### Edge Cases & Error Handling

**Empty Sites List**
- [ ] Component still renders
- [ ] Autocomplete field is functional
- [ ] User can switch to "New Site" mode
- [ ] Expected: Allow creating new site if none exist

**Rapid Search**
- [ ] Type quickly: "AcmeBuild"
- [ ] Results update without freezing
- [ ] No duplicate results
- [ ] Expected: Debouncing or efficient filtering

**Very Long Site Names/Addresses**
- [ ] "A very long site name that goes on and on with lots of words..."
- [ ] Display doesn't break or overlap
- [ ] Text is readable or truncated with ellipsis
- [ ] Expected: Graceful handling, no layout shift

**Special Characters**
- [ ] Type "O'Reilly" or "Café" or "Main St. #123"
- [ ] Search filters correctly
- [ ] Results display correctly
- [ ] Expected: No encoding issues

**Form State Preservation**
- [ ] Select site A
- [ ] Fill out other form fields (client, inspection date, etc.)
- [ ] Switch to "New Site" mode
- [ ] Other form fields are still filled
- [ ] Switch back to "Select Existing Site"
- [ ] Other form fields are still filled
- [ ] Expected: Site selector doesn't wipe out form progress

### Integration with Rest of Form

**Existing Site Flow**
- [ ] Select existing site
- [ ] Rest of form appears (client, inspection type, etc.)
- [ ] Continue to irrigation system sections (Task 3: should see pre-filled equipment)
- [ ] Can save inspection normally
- [ ] Expected: Seamless integration, no missing fields

**New Site Flow**
- [ ] Enter new site name/address
- [ ] Rest of form appears
- [ ] Fill in client, inspection details, irrigation info
- [ ] Save inspection
- [ ] New site is created
- [ ] Inspection is linked to new site
- [ ] Expected: Full end-to-end flow works

### Visual Regression

**Screenshots to Document** (before/after if updating design):
- [ ] Site selector in "select existing" mode
- [ ] Site selector in "new site" mode
- [ ] Dropdown with search results (3-5 items)
- [ ] Dropdown with no results
- [ ] Site selector on mobile/tablet (if responsive)
- [ ] Dark theme colors are correct

## Sign-Off Checklist

- [ ] All golden path test cases pass
- [ ] All search functionality works correctly
- [ ] Accessibility requirements met (keyboard, screen reader, colors)
- [ ] Edge cases handled gracefully
- [ ] Form integration works (other fields, save, etc.)
- [ ] No console errors or warnings
- [ ] No visual glitches or layout shifts
- [ ] Mobile/tablet layout works (if applicable)
- [ ] Performance is acceptable (no noticeable lag)
- [ ] Ready for production

## Tools & Evidence

**Manual Testing**:
- Use browser DevTools to check colors, contrast (Lighthouse accessibility audit)
- Test on Chrome/Firefox/Safari if possible
- Use keyboard for navigation testing
- Test on mobile device or DevTools mobile emulation

**Automated E2E (Playwright)** (optional):
If Playwright tests are used per E2E_TEST_PLAN.md:
- [ ] Add tests for site selection flow
- [ ] Add tests for new site creation flow
- [ ] Add tests for mode switching
- [ ] Document in `e2e/` directory

**Screenshots/Video**:
- Take screenshots of key states (select, new, dropdown, error)
- Record video if testing complex interactions (good for documentation)

## Failure Scenarios

If any test fails:
1. Document the exact failure (screenshot, steps, actual vs. expected)
2. Create a bug or task for the developer
3. Do not sign off until resolved
4. Possible causes:
   - Styling doesn't match dark theme
   - Dropdown doesn't show/hide correctly
   - Search is too slow or doesn't filter
   - Form fields don't populate on selection
   - Accessibility features missing (focus state, labels)
