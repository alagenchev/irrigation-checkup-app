# Unit Test Instructions: auto-select-single-inspector

## Goal

Verify the three inspector-count scenarios in `IrrigationForm`: 0 inspectors, 1 inspector, 2+ inspectors. Tests live in the existing component test file.

**File**: `__tests__/irrigation-form.test.tsx`

Add a new `describe` block — do not touch existing tests.

---

## Setup

The form needs minimal props. Use these fixtures:

```ts
const ONE_INSPECTOR = [
  { id: 'insp-1', companyId: 'co-1', firstName: 'Jane', lastName: 'Smith', licenseNum: 'LIC-123', email: null, phone: null, createdAt: new Date() },
]

const TWO_INSPECTORS = [
  { id: 'insp-1', companyId: 'co-1', firstName: 'Jane', lastName: 'Smith',  licenseNum: 'LIC-123', email: null, phone: null, createdAt: new Date() },
  { id: 'insp-2', companyId: 'co-1', firstName: 'Bob',  lastName: 'Jones',  licenseNum: 'LIC-456', email: null, phone: null, createdAt: new Date() },
]

// Minimal props that satisfy IrrigationFormProps
const BASE_PROPS = {
  clients: [],
  sites: [],
  company: { companyId: 'co-1', companyName: 'Test Co', licenseNum: '', companyAddress: '', companyCityStateZip: '', companyPhone: '', performedBy: '', r2CompanyBucketId: null, updatedAt: new Date() },
}
```

---

## Test Cases

```ts
describe('IrrigationForm — inspector field', () => {

  describe('when 0 inspectors', () => {
    it('renders the inspector <select> dropdown', () => {
      render(<IrrigationForm {...BASE_PROPS} inspectors={[]} />)
      expect(screen.getByRole('combobox', { name: /inspector/i })).toBeInTheDocument()
    })

    it('shows the placeholder option "— Select Inspector —"', () => {
      render(<IrrigationForm {...BASE_PROPS} inspectors={[]} />)
      expect(screen.getByRole('option', { name: /select inspector/i })).toBeInTheDocument()
    })

    it('inspectorId initialises to empty string', () => {
      render(<IrrigationForm {...BASE_PROPS} inspectors={[]} />)
      const select = screen.getByRole('combobox', { name: /inspector/i }) as HTMLSelectElement
      expect(select.value).toBe('')
    })
  })

  describe('when 1 inspector', () => {
    it('does NOT render a <select> dropdown', () => {
      render(<IrrigationForm {...BASE_PROPS} inspectors={ONE_INSPECTOR} />)
      expect(screen.queryByRole('combobox', { name: /inspector/i })).not.toBeInTheDocument()
    })

    it('renders the inspector name as static text', () => {
      render(<IrrigationForm {...BASE_PROPS} inspectors={ONE_INSPECTOR} />)
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('renders the inspector license number', () => {
      render(<IrrigationForm {...BASE_PROPS} inspectors={ONE_INSPECTOR} />)
      expect(screen.getByText('LIC-123')).toBeInTheDocument()
    })

    it('form state has inspectorId pre-set to the single inspector id', () => {
      // Indirectly verified: the license number appearing proves inspectorId === 'insp-1'
      // because selectedInspector is derived from form.inspectorId
      render(<IrrigationForm {...BASE_PROPS} inspectors={ONE_INSPECTOR} />)
      expect(screen.getByText('LIC-123')).toBeInTheDocument()
    })
  })

  describe('when 2+ inspectors', () => {
    it('renders the inspector <select> dropdown', () => {
      render(<IrrigationForm {...BASE_PROPS} inspectors={TWO_INSPECTORS} />)
      expect(screen.getByRole('combobox', { name: /inspector/i })).toBeInTheDocument()
    })

    it('shows all inspector options in the dropdown', () => {
      render(<IrrigationForm {...BASE_PROPS} inspectors={TWO_INSPECTORS} />)
      expect(screen.getByRole('option', { name: /jane smith/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /bob jones/i })).toBeInTheDocument()
    })

    it('inspectorId initialises to empty string (no auto-select)', () => {
      render(<IrrigationForm {...BASE_PROPS} inspectors={TWO_INSPECTORS} />)
      const select = screen.getByRole('combobox', { name: /inspector/i }) as HTMLSelectElement
      expect(select.value).toBe('')
    })
  })

  describe('edit mode (initialData provided)', () => {
    it('preserves the inspectorId from initialData even when only 1 inspector', () => {
      // If initialData already has inspectorId set, the useState default branch is not taken
      // so the single-inspector auto-select must not override it
      // (In practice both would be the same id, but confirm no regression)
      const initialData = {
        form: { .../* minimal form shape */, inspectorId: 'insp-1' },
        // ... other required initialData fields
      }
      render(<IrrigationForm {...BASE_PROPS} inspectors={ONE_INSPECTOR} initialData={initialData} />)
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('LIC-123')).toBeInTheDocument()
    })
  })

})
```

### Note on the `initialData` test

The `initialData` shape is complex. Look at how other tests in `__tests__/irrigation-form.test.tsx` construct it and follow the same pattern. The key assertion is just that name + license render, proving `inspectorId` was picked up correctly.

---

## Running Tests

```bash
npm test -- --testPathPattern="irrigation-form"
```

All new tests must pass alongside existing tests in that file (do not break anything).

---

## Success Criteria

- [ ] 0-inspector tests: dropdown renders, placeholder present, value empty
- [ ] 1-inspector tests: no dropdown, name shown as text, license shown, form pre-selected
- [ ] 2+-inspector tests: dropdown renders, both options present, value empty
- [ ] Edit-mode test: `initialData.form.inspectorId` is respected
- [ ] All existing `irrigation-form.test.tsx` tests still pass
