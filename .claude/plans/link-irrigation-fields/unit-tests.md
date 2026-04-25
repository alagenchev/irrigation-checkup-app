# Unit Test Instructions: link-irrigation-fields

## Goal
Test the `getSiteEquipment` server action and form state updates when a site is selected.

## Test Files

### 1. `__tests__/get-site-equipment.integration.test.ts`
**Purpose**: Test the `getSiteEquipment` server action against the real database

**Mock Setup**:
- Mock `getRequiredCompanyId()` to return `TEST_COMPANY_ID`
- Use `withRollback()` for test isolation

**Test Suite**:
```ts
describe('getSiteEquipment', () => {
  // Tests below
})
```

**Test Cases**:

#### Loading Equipment from Existing Site
```
✓ loads controllers for a site
✓ loads zones for a site
✓ loads backflows for a site
✓ loads system overview from latest site visit
✓ returns empty arrays for site with no equipment
✓ returns null overview if site has no visits
✓ transforms DB rows to form data shapes correctly
```

#### Multi-tenancy & Access Control
```
✓ only returns equipment for the current company
✓ throws error if site not found
✓ throws error if site belongs to different company
✓ filters by siteId correctly
```

#### Data Transformation
```
✓ controllers have correct shape (id, location, manufacturer, model, etc.)
✓ zones have correct shape (id, zoneNum, controller, description, etc.)
✓ backflows have correct shape (id, manufacturer, type, model, size)
✓ overview has correct shape (staticPressure, flags, notes)
✓ nullable fields are handled (undefined becomes empty string or false)
```

#### Edge Cases
```
✓ handles site with many controllers (100+)
✓ handles site with many zones
✓ handles zones without photos
✓ handles controllers without master valve
✓ handles multiple backflow devices per site
```

### 2. `__tests__/irrigation-form.test.tsx` (existing, add to it)
**Purpose**: Test IrrigationForm integration with equipment loading

**New Test Cases**:

#### Site Selection & Equipment Loading
```
describe('IrrigationForm equipment loading', () => {
  ✓ calls getSiteEquipment when site is selected
  ✓ populates controllers from loaded equipment
  ✓ populates zones from loaded equipment
  ✓ populates backflows from loaded equipment
  ✓ populates system overview fields
  ✓ shows loading state while fetching
  ✓ shows error message if getSiteEquipment fails
  ✓ clears equipment sections on error
})
```

#### Conditional Rendering
```
describe('IrrigationForm conditional sections', () => {
  ✓ sections are hidden until siteSelected = true
  ✓ shows placeholder message when no site selected
  ✓ shows sections when siteSelected = true
  ✓ sections are visible with loaded equipment
  ✓ sections are visible and empty for new site mode
})
```

#### New Site Mode
```
describe('IrrigationForm new site mode', () => {
  ✓ clears controllers when switching to new site
  ✓ clears zones when switching to new site
  ✓ clears backflows when switching to new site
  ✓ clears overview fields when switching to new site
  ✓ keeps siteSelected = true so sections remain visible
})
```

#### Form Save with Loaded Equipment
```
describe('IrrigationForm save with pre-filled equipment', () => {
  ✓ saves inspection with loaded equipment correctly
  ✓ preserves loaded equipment data in submission
  ✓ allows editing loaded equipment before save
  ✓ doesn't duplicate equipment on save
})
```

## Mocking Strategy

### Mock Server Action
```ts
jest.mock('@/actions/sites', () => ({
  getSiteEquipment: jest.fn(),
}))
```

### Mock Return Data
```ts
const MOCK_EQUIPMENT = {
  controllers: [
    {
      id: 1,
      location: 'Front',
      manufacturer: 'Hunter',
      model: 'Pro-HC',
      sensors: 'Rain/Freeze',
      numZones: '8',
      masterValve: true,
      masterValveNotes: 'Working',
      notes: 'Recently serviced',
    },
  ],
  zones: [
    {
      id: 2,
      zoneNum: '1',
      controller: '1',
      description: 'Front lawn',
      landscapeTypes: ['Full-sun turf'],
      irrigationTypes: ['Rotor'],
      notes: 'Needs head replacement',
      photoData: [],
    },
  ],
  backflows: [
    {
      id: 3,
      manufacturer: 'Watts',
      type: 'Reduced Pressure',
      model: 'RPC',
      size: '1',
    },
  ],
  overview: {
    staticPressure: '65',
    backflowInstalled: true,
    backflowServiceable: true,
    isolationValve: true,
    systemNotes: 'Good condition',
  },
}
```

## Test Data Setup

For integration tests, create test sites with equipment:
```ts
// Create site in test DB
const site = await db.insert(sites).values({
  id: 'test-site-1',
  name: 'Test Site',
  address: '123 Test St',
  companyId: TEST_COMPANY_ID,
  // ... other fields
})

// Create controllers, zones, backflows
await db.insert(siteControllers).values({
  siteId: 'test-site-1',
  companyId: TEST_COMPANY_ID,
  // ... controller data
})

// Create visit with overview data
await db.insert(siteVisits).values({
  siteId: 'test-site-1',
  companyId: TEST_COMPANY_ID,
  staticPressure: '65',
  // ... other fields
})
```

## Coverage Targets

- **getSiteEquipment**: >95% coverage
- **Equipment loading logic**: 100% coverage
- **Conditional rendering**: >90% coverage
- **Error handling**: 100% coverage

## Success Criteria

- [ ] All test cases pass
- [ ] Integration tests hit real database and clean up
- [ ] Coverage targets met
- [ ] No console errors or warnings
- [ ] Tests run in <10 seconds total
- [ ] All edge cases covered
