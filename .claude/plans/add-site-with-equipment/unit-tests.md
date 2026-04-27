# Unit Test Instructions: add-site-with-equipment

## Goal

Test the two-phase behaviour of `AddSiteForm`: phase 1 (site fields), the transition, and phase 2 (equipment editor).

**New file**: `__tests__/add-site-form.test.tsx`

---

## Mocks

```ts
// Mock createSite server action
jest.mock('@/actions/sites', () => ({
  createSite: jest.fn(),
}))

// Mock SiteEquipmentEditor — we only care that it renders and that its callbacks work
jest.mock('@/app/sites/site-equipment-editor', () => ({
  SiteEquipmentEditor: ({ site, onClose, onSave }: any) => (
    <div data-testid="site-equipment-editor">
      <span data-testid="editor-site-name">{site.name}</span>
      <button data-testid="equipment-editor-save" onClick={onSave}>Save</button>
      <button data-testid="equipment-editor-cancel" onClick={onClose}>Cancel</button>
    </div>
  ),
}))

// Mock address and autocomplete UI components — they have their own tests elsewhere
jest.mock('@/components/ui/autocomplete', () => ({
  Autocomplete: ({ name, value, onChange, placeholder }: any) => (
    <input name={name} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  ),
}))
jest.mock('@/components/ui/address-autocomplete', () => ({
  AddressAutocomplete: ({ name, value, onChange, placeholder }: any) => (
    <input name={name} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  ),
}))
```

Import `createSite` mock handle at the top:

```ts
import { createSite } from '@/actions/sites'
const mockCreateSite = createSite as jest.MockedFunction<typeof createSite>
```

---

## Setup

```ts
const MOCK_CLIENTS = [
  { id: 'c-1', companyId: 'co-1', name: 'Acme Corp', address: '1 Corp Way', phone: null, email: null, accountType: null, accountNumber: null, createdAt: new Date() },
]

const CREATED_SITE = {
  id: 'site-new',
  companyId: 'co-1',
  name: 'New Site',
  address: '99 New St',
  clientId: null,
  notes: null,
  createdAt: new Date(),
}
```

Reset mocks in `beforeEach`:

```ts
beforeEach(() => {
  mockCreateSite.mockReset()
})
```

---

## Test Cases

```ts
describe('AddSiteForm', () => {

  describe('phase 1 — site creation form', () => {
    it('renders the site name input', () => {
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      expect(screen.getByPlaceholderText(/acme hq/i)).toBeInTheDocument()
    })

    it('renders the Add Site submit button', () => {
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      expect(screen.getByRole('button', { name: /add site/i })).toBeInTheDocument()
    })

    it('does NOT render the equipment editor in phase 1', () => {
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      expect(screen.queryByTestId('site-equipment-editor')).not.toBeInTheDocument()
    })

    it('shows a validation error when createSite returns an error', async () => {
      mockCreateSite.mockResolvedValue({ ok: false, error: 'Name is required' })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      await userEvent.type(screen.getByPlaceholderText(/acme hq/i), 'x')
      await userEvent.click(screen.getByRole('button', { name: /add site/i }))
      expect(await screen.findByText('Name is required')).toBeInTheDocument()
    })

    it('shows "Saving…" on the button while the action is in flight', async () => {
      mockCreateSite.mockImplementation(() => new Promise(() => {})) // never resolves
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      await userEvent.type(screen.getByPlaceholderText(/acme hq/i), 'My Site')
      await userEvent.click(screen.getByRole('button', { name: /add site/i }))
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    })
  })

  describe('phase 2 — equipment editor after successful creation', () => {
    async function createSiteAndTransition() {
      mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      await userEvent.type(screen.getByPlaceholderText(/acme hq/i), 'New Site')
      await userEvent.click(screen.getByRole('button', { name: /add site/i }))
      await screen.findByTestId('add-site-equipment-phase')
    }

    it('transitions to phase 2 after successful createSite', async () => {
      await createSiteAndTransition()
      expect(screen.getByTestId('site-equipment-editor')).toBeInTheDocument()
    })

    it('shows the newly created site name in phase 2', async () => {
      await createSiteAndTransition()
      expect(screen.getByTestId('editor-site-name')).toHaveTextContent('New Site')
    })

    it('shows a "Skip" button in phase 2', async () => {
      await createSiteAndTransition()
      expect(screen.getByTestId('add-site-skip-equipment')).toBeInTheDocument()
    })

    it('does NOT show the site creation form in phase 2', async () => {
      await createSiteAndTransition()
      expect(screen.queryByRole('button', { name: /add site/i })).not.toBeInTheDocument()
    })
  })

  describe('reset — returning to phase 1', () => {
    async function reachPhase2() {
      mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      await userEvent.type(screen.getByPlaceholderText(/acme hq/i), 'New Site')
      await userEvent.click(screen.getByRole('button', { name: /add site/i }))
      await screen.findByTestId('add-site-equipment-phase')
    }

    it('clicking Skip returns to phase 1', async () => {
      await reachPhase2()
      await userEvent.click(screen.getByTestId('add-site-skip-equipment'))
      expect(await screen.findByRole('button', { name: /add site/i })).toBeInTheDocument()
      expect(screen.queryByTestId('site-equipment-editor')).not.toBeInTheDocument()
    })

    it('equipment editor Save returns to phase 1', async () => {
      await reachPhase2()
      await userEvent.click(screen.getByTestId('equipment-editor-save'))
      expect(await screen.findByRole('button', { name: /add site/i })).toBeInTheDocument()
    })

    it('equipment editor Cancel returns to phase 1', async () => {
      await reachPhase2()
      await userEvent.click(screen.getByTestId('equipment-editor-cancel'))
      expect(await screen.findByRole('button', { name: /add site/i })).toBeInTheDocument()
    })

    it('form fields are cleared after returning to phase 1', async () => {
      await reachPhase2()
      await userEvent.click(screen.getByTestId('add-site-skip-equipment'))
      const nameInput = await screen.findByPlaceholderText(/acme hq/i)
      expect(nameInput).toHaveValue('')
    })

    it('error message is cleared after returning to phase 1', async () => {
      // First trigger an error, then succeed and skip
      mockCreateSite.mockResolvedValueOnce({ ok: false, error: 'Something went wrong' })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      await userEvent.click(screen.getByRole('button', { name: /add site/i }))
      expect(await screen.findByText('Something went wrong')).toBeInTheDocument()

      mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
      await userEvent.type(screen.getByPlaceholderText(/acme hq/i), 'New Site')
      await userEvent.click(screen.getByRole('button', { name: /add site/i }))
      await screen.findByTestId('add-site-equipment-phase')
      await userEvent.click(screen.getByTestId('add-site-skip-equipment'))

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

})
```

---

## Running Tests

```bash
npm test -- --testPathPattern="add-site-form"
```

---

## Success Criteria

- [ ] Phase 1 renders correctly
- [ ] Error state from `createSite` is displayed
- [ ] Saving state disables the button
- [ ] Successful `createSite` transitions to phase 2
- [ ] Phase 2 shows the equipment editor with correct site name
- [ ] Phase 2 shows the Skip button
- [ ] Skip, Save, and Cancel all return to phase 1 with cleared state
- [ ] All tests pass without touching existing test files
