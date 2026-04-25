# Unit Test Instructions: sites-menu-irrigation

## Goal
Test the `updateSiteEquipment` server action and `SiteEquipmentEditor` component.

## Test Files

### 1. `__tests__/update-site-equipment.integration.test.ts`
**Test the server action**:

```
describe('updateSiteEquipment', () => {
  ✓ updates controllers for a site
  ✓ updates zones for a site
  ✓ updates backflows for a site
  ✓ deletes old equipment when new equipment is provided
  ✓ clears all equipment when empty arrays are provided
  ✓ validates controller data with Zod
  ✓ validates zone data with Zod
  ✓ validates backflow data with Zod
  ✓ enforces multi-tenancy (only updates own company's site)
  ✓ throws error if site not found
  ✓ throws error if user doesn't have access
  ✓ uses transaction (all-or-nothing)
  ✓ returns error on validation failure
  ✓ returns success on valid input
})
```

**Setup**:
- Create test site with initial equipment
- Mock `getRequiredCompanyId()`
- Use `withRollback()` for isolation

### 2. `__tests__/site-equipment-editor.test.tsx`
**Test the component**:

```
describe('SiteEquipmentEditor', () => {
  ✓ renders site info (readonly)
  ✓ renders controllers section
  ✓ renders zones section
  ✓ renders backflows section
  ✓ renders system overview fields
  ✓ allows adding controller
  ✓ allows removing controller
  ✓ allows editing controller fields
  ✓ allows adding zone
  ✓ allows removing zone
  ✓ allows editing zone fields
  ✓ allows adding backflow
  ✓ allows removing backflow
  ✓ calls updateSiteEquipment on save
  ✓ calls onClose on cancel
  ✓ shows loading state while saving
  ✓ shows error message if save fails
  ✓ disables submit button while saving
})
```

**Mock Data**:
```ts
const MOCK_SITE = {
  id: 'site-1',
  name: 'Test Site',
  address: '123 Test St',
  clientId: 'client-1',
  clientName: 'Test Client',
  // ...
}
```

### 3. `__tests__/sites-page.test.tsx` (existing, add to it)
**Test page integration**:

```
describe('SitesPage with equipment editor', () => {
  ✓ renders sites table
  ✓ renders equipment editor when site is selected
  ✓ hides equipment editor initially
  ✓ shows selected site in editor
  ✓ closes editor on cancel
  ✓ closes editor on successful save
  ✓ refreshes site list after equipment save
  ✓ switches to different site when clicking edit on another site
})
```

## Mocking

Mock the server action:
```ts
jest.mock('@/actions/sites', () => ({
  updateSiteEquipment: jest.fn(),
}))
```

## Coverage Targets

- `updateSiteEquipment`: >95%
- `SiteEquipmentEditor`: >90%
- Page integration: >85%

## Success Criteria

- [ ] All tests pass
- [ ] Coverage targets met
- [ ] No console warnings
- [ ] Tests complete in <10 seconds
