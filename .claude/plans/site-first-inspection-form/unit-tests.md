# Unit Test Instructions: site-first-inspection-form

**UUID**: `c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f`

## Scope

Unit tests for the two changed files:

1. `app/components/site-selector.tsx` — existing-site group rendering
2. `app/irrigation-form.tsx` — lock state logic (client lock, equipment lock)

Existing `SiteSelector` unit tests live in `__tests__/site-selector.test.tsx`. Update them in-place.
New lock-state tests go in `__tests__/irrigation-form-lock.test.tsx` (new file, thin render tests).

---

## 1. SiteSelector — `__tests__/site-selector.test.tsx`

### Existing tests that must still pass (verify, don't delete)

- `filterSites` — all existing filter tests
- `siteToOption` — mapping test

### New tests to add

#### Grouping — existing mode

```ts
describe('SiteSelector existing mode', () => {
  it('renders an "Existing Site" group label', () => {
    render(<SiteSelector mode="existing" ... />)
    expect(screen.getByText(/existing site/i)).toBeInTheDocument()
  })

  it('group label is NOT present in new mode', () => {
    render(<SiteSelector mode="new" ... />)
    expect(screen.queryByText(/existing site/i)).not.toBeInTheDocument()
  })

  it('+ New Site toggle button is inside the group in existing mode', () => {
    render(<SiteSelector mode="existing" disabled={false} ... />)
    const label = screen.getByText(/existing site/i)
    // The mode-toggle button should be a descendant of the same group container
    const group = label.closest('[data-testid="site-selector-existing-mode"]') ??
                  label.parentElement
    expect(group).toContainElement(screen.getByTestId('site-selector-mode-toggle'))
  })
})
```

Use the minimal required props for `SiteSelector` (empty arrays are fine):
```ts
const defaultProps = {
  sites: [],
  selectedSiteName: '',
  selectedAddress: '',
  onSiteSelect: jest.fn(),
  onModeChange: jest.fn(),
  onNewSiteNameChange: jest.fn(),
  onNewAddressChange: jest.fn(),
}
```

---

## 2. Lock state logic — `__tests__/irrigation-form-lock.test.tsx`

The `IrrigationForm` component is large and depends on many server actions. Use the same mocking
pattern established in existing `irrigation-form` test files (check `__tests__/` for the current
mock setup for `getSiteEquipment`, `createIrrigation`, etc.).

### Setup

```ts
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { IrrigationForm } from '@/app/irrigation-form'
import { getSiteEquipment } from '@/actions/sites'

jest.mock('@/actions/sites', () => ({
  getSiteEquipment: jest.fn(),
  getSites: jest.fn().mockResolvedValue([]),
}))

const mockSite = {
  id: 1,
  name: 'Test Site',
  address: '100 Oak St',
  clientName: 'Acme Corp',
  clientAddress: '200 Elm St',
}

const defaultProps = {
  clients: [{ id: 1, name: 'Acme Corp', address: '200 Elm St', email: 'a@b.com' }],
  sites: [mockSite],
  company: { name: 'Co', address: '', phone: '', licenseNum: '' },
  inspectors: [],
}
```

### Tests

#### Client fields lock after site selection

```ts
it('client name field is locked (readOnly) immediately after selecting an existing site', async () => {
  ;(getSiteEquipment as jest.Mock).mockResolvedValue({
    controllers: [], zones: [], backflows: [], overview: null,
  })

  render(<IrrigationForm {...defaultProps} />)

  // Simulate selecting a site via the SiteSelector onSiteSelect callback
  // Find the site autocomplete and trigger a selection
  const siteInput = screen.getByPlaceholderText(/type or select a site/i)
  fireEvent.change(siteInput, { target: { value: 'Test Site' } })
  const option = await screen.findByText('Test Site')
  fireEvent.click(option)

  await waitFor(() => {
    expect(screen.getByTestId('client-name-locked')).toBeInTheDocument()
  })
})
```

#### Client fields unlock on click

```ts
it('clicking a locked client field unlocks all client fields', async () => {
  ;(getSiteEquipment as jest.Mock).mockResolvedValue({
    controllers: [], zones: [], backflows: [], overview: null,
  })

  render(<IrrigationForm {...defaultProps} />)

  // Select site (same as above)
  const siteInput = screen.getByPlaceholderText(/type or select a site/i)
  fireEvent.change(siteInput, { target: { value: 'Test Site' } })
  fireEvent.click(await screen.findByText('Test Site'))

  await waitFor(() => screen.getByTestId('client-name-locked'))

  // Click the locked client name input
  fireEvent.click(screen.getByTestId('client-name-locked'))

  // After click, the locked input is replaced with the Autocomplete
  await waitFor(() => {
    expect(screen.queryByTestId('client-name-locked')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/type or select a client/i)).toBeInTheDocument()
  })
})
```

#### Equipment overlay shown after site selection

```ts
it('equipment lock overlay is present after site selection', async () => {
  ;(getSiteEquipment as jest.Mock).mockResolvedValue({
    controllers: [{ id: 1, location: 'Front', manufacturer: '', model: '', sensors: '', numZones: '2', masterValve: false, masterValveNotes: '', notes: '' }],
    zones: [], backflows: [], overview: null,
  })

  render(<IrrigationForm {...defaultProps} />)

  const siteInput = screen.getByPlaceholderText(/type or select a site/i)
  fireEvent.change(siteInput, { target: { value: 'Test Site' } })
  fireEvent.click(await screen.findByText('Test Site'))

  await waitFor(() => {
    expect(screen.getByTestId('equipment-lock-overlay')).toBeInTheDocument()
  })
})
```

#### Equipment overlay removed on click

```ts
it('clicking the equipment lock overlay removes it', async () => {
  ;(getSiteEquipment as jest.Mock).mockResolvedValue({
    controllers: [], zones: [], backflows: [], overview: null,
  })

  render(<IrrigationForm {...defaultProps} />)

  const siteInput = screen.getByPlaceholderText(/type or select a site/i)
  fireEvent.change(siteInput, { target: { value: 'Test Site' } })
  fireEvent.click(await screen.findByText('Test Site'))

  await waitFor(() => screen.getByTestId('equipment-lock-overlay'))

  fireEvent.click(screen.getByTestId('equipment-lock-overlay'))

  await waitFor(() => {
    expect(screen.queryByTestId('equipment-lock-overlay')).not.toBeInTheDocument()
  })
})
```

#### Switching to New Site mode clears locks

```ts
it('switching to new site mode clears client and equipment locks', async () => {
  ;(getSiteEquipment as jest.Mock).mockResolvedValue({
    controllers: [], zones: [], backflows: [], overview: null,
  })

  render(<IrrigationForm {...defaultProps} />)

  // Select site to set locks
  const siteInput = screen.getByPlaceholderText(/type or select a site/i)
  fireEvent.change(siteInput, { target: { value: 'Test Site' } })
  fireEvent.click(await screen.findByText('Test Site'))
  await waitFor(() => screen.getByTestId('client-name-locked'))

  // Click "+ New Site" toggle
  fireEvent.click(screen.getByTestId('site-selector-mode-toggle'))

  await waitFor(() => {
    expect(screen.queryByTestId('client-name-locked')).not.toBeInTheDocument()
    expect(screen.queryByTestId('equipment-lock-overlay')).not.toBeInTheDocument()
  })
})
```

#### Site section appears before client section in DOM

```ts
it('site selector wrapper appears before client name field in the DOM', () => {
  render(<IrrigationForm {...defaultProps} />)

  const siteWrapper = screen.getByTestId('site-selector-wrapper')
  const clientNameInput = screen.getByPlaceholderText(/type or select a client/i)

  // compareDocumentPosition: if siteWrapper precedes clientNameInput, result has DOCUMENT_POSITION_FOLLOWING bit
  const position = siteWrapper.compareDocumentPosition(clientNameInput)
  expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})
```

---

## Run command

```bash
npm test -- --testPathPattern="site-selector|irrigation-form-lock"
```

All 271 existing tests must continue to pass.
