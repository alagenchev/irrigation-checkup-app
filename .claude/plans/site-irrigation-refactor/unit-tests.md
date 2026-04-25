# Unit Test Instructions: site-irrigation-refactor

## Goal
Write integration tests that verify all three subtasks work together correctly.

## Test Files

### `__tests__/site-equipment-integration.integration.test.ts`
**Purpose**: End-to-end integration tests across site-selector-ui, link-irrigation-fields, sites-menu-irrigation

**Test Suite**:
```ts
describe('Site Equipment Management Integration', () => {
  // Tests below
})
```

**Test Cases**:

#### Round-trip Data Flow
```
✓ equipment created via getSiteEquipment loads correctly in updateSiteEquipment
✓ equipment updated in updateSiteEquipment loads correctly in getSiteEquipment
✓ site selection → equipment load → edit → save → reload shows persisted changes
✓ equipment persists correctly after inspection save and site reload
```

#### Multi-context Equipment Handling
```
✓ same equipment accessible from inspection form and sites page
✓ editing equipment in sites page doesn't corrupt inspection equipment
✓ creating site in inspection flow persists equipment correctly
✓ equipment from sites page appears correctly in new inspection
```

#### Type & Data Integrity
```
✓ ControllerFormData shapes match across all contexts
✓ ZoneFormData shapes match across all contexts
✓ BackflowFormData shapes match across all contexts
✓ no data loss in round-trip database → form → database
✓ equipment IDs remain consistent across operations
```

#### Concurrency & State
```
✓ rapid equipment loads don't cause race conditions
✓ equipment edit followed by load shows latest changes
✓ concurrent edits from different sessions don't corrupt data
✓ form state preserved during equipment load
```

#### Multi-tenancy
```
✓ company A's equipment invisible to company B
✓ equipment operations filtered correctly by companyId
✓ cross-tenant access is prevented
```

## Test Setup

### Database State
- Create company A with test sites
- Create company B with separate sites
- Populate with various equipment configurations:
  - Site with many controllers/zones
  - Site with no equipment
  - Site with partial equipment

### Mocking
- Mock `getRequiredCompanyId()` per test
- Use real DB for integration (with `withRollback()`)

## Coverage Targets

- Integration paths: 100%
- Data transformation: 100%
- Error paths: >95%

## Running Integration Tests

```bash
npm run test:db -- site-equipment-integration.integration.test.ts
```

## Success Criteria

- [ ] All tests pass
- [ ] No race conditions or data corruption
- [ ] Cross-tenant isolation verified
- [ ] 100% coverage of integration paths
