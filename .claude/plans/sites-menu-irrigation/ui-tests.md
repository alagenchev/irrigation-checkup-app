# UI Testing Instructions: sites-menu-irrigation

## Goal
Verify that the equipment editor on the Sites page works correctly for viewing and editing site equipment.

## Testing Environment

**Prerequisites**:
- Dev server running: `npm run dev`
- Logged in to app
- Test sites with existing equipment (same as Task 3)

## Test Cases

### Golden Path: Edit Equipment from Sites Page

**Steps**:
1. Navigate to `/sites`
2. See list of sites
3. Find "Acme HQ – Equipment" in table
4. Click "Edit Equipment" button
5. Equipment editor panel appears on right
6. Verify site info displayed (readonly): name, address, client
7. Verify all equipment sections visible:
   - Controllers (showing existing controllers)
   - Zones (showing existing zones)
   - Backflows (showing existing backflows)
   - System Overview (showing existing data)
8. Modify a controller: change manufacturer from "Hunter" to "Rainbird"
9. Add new zone: fill in zone 4 details
10. Remove a backflow
11. Click "Save"
12. Verify loading state ("Saving...")
13. Verify success message or panel closes
14. Verify equipment is saved to database
15. Open same site again → verify changes persisted

**Expected Results**:
- [ ] Panel appears smoothly
- [ ] All equipment displays correctly
- [ ] Edits are possible
- [ ] Save works without errors
- [ ] Changes persist

### Golden Path: Cancel Without Saving

**Steps**:
1. Open sites page
2. Click "Edit Equipment" on a site
3. Panel appears with equipment
4. Make changes (edit a field, remove an item)
5. Click "Cancel" button
6. Panel closes without saving
7. Open same site again
8. Verify original equipment unchanged

**Expected Results**:
- [ ] Cancel button closes panel
- [ ] Changes are discarded
- [ ] Original data preserved

### Empty Equipment Site

**Steps**:
1. Sites page
2. Click "Edit Equipment" on "Green Valley – No Equipment"
3. Panel appears
4. All equipment sections empty
5. Add controllers, zones, backflows
6. Save
7. Verify new equipment created

**Expected Results**:
- [ ] Can add equipment to empty site
- [ ] Save works correctly

### Switch Between Sites

**Steps**:
1. Open site A's equipment
2. Edit a field
3. Click "Edit Equipment" on site B (without saving site A)
4. Verify:
   - Site A changes are discarded (not saved)
   - Site B's equipment loads
5. Close panel
6. Click edit on site A again
7. Verify original equipment (without changes from step 2)

**Expected Results**:
- [ ] Switching sites without saving discards changes
- [ ] Each site's data is independent

### Responsive Layout

**Desktop View**:
- [ ] Sites table on left (60-70% width)
- [ ] Equipment editor on right (30-40% width)
- [ ] Both visible and usable simultaneously

**Tablet/Mobile** (if applicable):
- [ ] Panel is full screen or overlaid
- [ ] Can close and return to table
- [ ] Touch targets are large enough

**Expected Results**:
- [ ] Layout works on all screen sizes
- [ ] No horizontal scrolling issues

### Error Handling

**Scenario: Save Fails**
- [ ] Edit equipment
- [ ] Click Save
- [ ] Simulate network error (DevTools throttle)
- [ ] Verify error message: "Error saving equipment: ..."
- [ ] User can retry or close

**Expected Results**:
- [ ] Error is shown clearly
- [ ] User is not stuck
- [ ] Can retry without re-entering data

### Accessibility

**Keyboard Navigation**:
- [ ] Tab through equipment form fields
- [ ] Focus visible throughout
- [ ] Save/Cancel buttons are keyboard accessible

**Screen Reader**:
- [ ] Site name/address announced
- [ ] Equipment section labels announced
- [ ] Form fields labeled properly
- [ ] Success/error messages announced

**Dark Theme**:
- [ ] All text readable
- [ ] Contrast meets WCAG AA
- [ ] Panel background distinguishable from table

**Expected Results**:
- [ ] All navigation works via keyboard
- [ ] Screen reader users can understand UI
- [ ] Colors are accessible

### Performance

**Steps**:
1. Open sites page
2. Open equipment editor for site with many items (50+ zones)
3. Measure panel load time
4. Measure save time
5. Edit multiple items
6. Save

**Expected Results**:
- [ ] Panel loads in <1 second
- [ ] Edits are smooth (no lag)
- [ ] Save completes in <3 seconds

## Visual Regression

**Screenshots**:
- [ ] Equipment panel open with data
- [ ] Panel with empty equipment
- [ ] Error state
- [ ] Saving state
- [ ] Mobile view (if applicable)

## Sign-Off Checklist

- [ ] Equipment editor displays correctly
- [ ] All CRUD operations work (create, read, update, delete)
- [ ] Save and cancel work
- [ ] Switching sites works properly
- [ ] Error handling is graceful
- [ ] Accessibility meets standards
- [ ] Performance is good
- [ ] No visual glitches
- [ ] Ready for production

## Failure Handling

Document and report any failures with:
- Screenshots
- Exact steps to reproduce
- Expected vs. actual result
- Severity (critical, high, medium, low)
