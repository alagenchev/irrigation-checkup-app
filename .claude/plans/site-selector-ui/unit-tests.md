# Unit Test Instructions: site-selector-ui

## Goal
Write comprehensive unit tests for the SiteSelector component and its integration with IrrigationForm.

## Test Files to Create

### 1. `__tests__/site-selector.test.tsx`
**Purpose**: Test the SiteSelector component in isolation

**Test Suite Structure**:
```ts
describe('SiteSelector', () => {
  // Test groups below
})
```

#### Test Group: Rendering & UI State
```
✓ renders with existing site mode by default
✓ renders with new site mode when mode='new'
✓ shows mode toggle button
✓ displays site list in existing mode
✓ displays site name and address inputs in new mode
✓ disables inputs when disabled=true prop
```

#### Test Group: Search & Filtering
```
✓ filters sites by name (case-insensitive)
✓ filters sites by address (case-insensitive)
✓ filters sites by partial match
✓ returns empty results when no match
✓ shows all sites when search is empty
✓ clears search results on mode change
✓ handles empty sites array gracefully
```

#### Test Group: Mode Switching
```
✓ calls onModeChange when switching to new site
✓ calls onModeChange when switching to existing site
✓ clears new site inputs on mode switch
✓ preserves existing site selection after mode switch back
```

#### Test Group: Site Selection
```
✓ calls onSiteSelect with selected site object
✓ populates selected site name and address in UI
✓ calls onSiteSelect only once per selection (no duplicates)
✓ handles selection from autocomplete dropdown
✓ handles selection from keyboard navigation
```

#### Test Group: New Site Mode
```
✓ calls onNewSiteNameChange on name input change
✓ calls onNewAddressChange on address input change
✓ allows free-form text entry in new site mode
✓ clears address when user clears it
✓ preserves user input if mode switches back
```

#### Test Group: Accessibility
```
✓ has proper aria-labels on inputs
✓ supports keyboard navigation (Tab, Enter, Escape)
✓ has semantic HTML structure
✓ search results are announced to screen readers
```

#### Test Group: Edge Cases
```
✓ handles very long site names/addresses
✓ handles special characters in search
✓ handles sites with missing clientName
✓ handles duplicate site names
✓ handles rapid prop changes
```

### 2. `__tests__/irrigation-form.test.tsx` (existing file, add tests)
**Purpose**: Test IrrigationForm integration with SiteSelector

**New Tests to Add**:
```
describe('IrrigationForm with SiteSelector', () => {
  ✓ renders SiteSelector at top of form
  ✓ initializes with existing site mode
  ✓ populates siteName from selected site
  ✓ populates siteAddress from selected site
  ✓ preserves siteMode state across re-renders
  ✓ allows switching from existing to new site mode
  ✓ allows switching from new to existing site mode
  ✓ clears form fields appropriately when changing modes
  ✓ does not clear non-site form fields when mode changes
})
```

## Mocking Strategy

### Mock Data
```ts
const MOCK_SITES: SiteWithClient[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Acme HQ – Building A',
    address: '123 Main St, Denver, CO',
    clientId: 'client-1',
    clientName: 'Acme Corp',
    clientAddress: '100 Corporate Way',
    notes: 'Front entrance',
    createdAt: new Date('2026-01-01'),
    companyId: 'company-1',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Acme HQ – Building B',
    address: '125 Main St, Denver, CO',
    clientId: 'client-1',
    clientName: 'Acme Corp',
    clientAddress: '100 Corporate Way',
    notes: 'Back parking lot',
    createdAt: new Date('2026-01-01'),
    companyId: 'company-1',
  },
  // ...
]
```

### Mock Callbacks
Mock all callback props:
- `onSiteSelect`
- `onModeChange`
- `onNewSiteNameChange`
- `onNewAddressChange`

Use `jest.fn()` to track calls and arguments.

## Coverage Targets

- **Overall**: >90% coverage for SiteSelector component
- **Critical paths**: 100% coverage for search logic, mode switching, site selection
- **Edge cases**: Covered for special characters, empty states, rapid changes

## Test Utilities

Use existing test helpers from `__tests__/`:
- `render()` from React Testing Library
- `screen` from React Testing Library
- `userEvent` for user interactions
- Mock Autocomplete component if needed (`jest.mock('@/components/ui/autocomplete')`)

## File Locations

```
__tests__/
├── site-selector.test.tsx    (new)
└── irrigation-form.test.tsx   (updated)
```

## Running Tests

```bash
npm test -- site-selector.test.tsx         # Run SiteSelector tests only
npm test -- irrigation-form.test.tsx       # Run form tests only
npm test                                    # Run all tests
```

## Success Criteria

- [ ] All test cases pass
- [ ] Coverage >90% for SiteSelector
- [ ] No console errors or warnings
- [ ] All accessibility tests pass
- [ ] Snapshot tests match expected output (if used)
- [ ] Tests run in <5 seconds
- [ ] Tests are isolated (no shared state between tests)
