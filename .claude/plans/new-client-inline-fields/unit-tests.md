# Unit Test Instructions: new-client-inline-fields

## Goal

Test the new inline client details behaviour in `AddSiteForm` and the extended `createSite` action.

**Extend existing**: `__tests__/add-site-form.test.tsx`
**New integration test**: `__tests__/actions/create-site-client-fields.integration.test.ts`

---

## Mocks (same as existing add-site-form.test.tsx — keep them)

```ts
jest.mock('@/actions/sites', () => ({ createSite: jest.fn() }))
jest.mock('@/app/sites/site-equipment-editor', () => ({
  SiteEquipmentEditor: ({ onClose, onSave }: any) => (
    <div data-testid="site-equipment-editor">
      <button data-testid="equipment-editor-save" onClick={onSave}>Save</button>
      <button data-testid="equipment-editor-cancel" onClick={onClose}>Cancel</button>
    </div>
  ),
}))
jest.mock('@/components/ui/autocomplete', () => ({
  Autocomplete: ({ name, value, onChange }: any) => (
    <input data-testid={`autocomplete-${name}`} name={name} value={value} onChange={e => onChange(e.target.value)} />
  ),
}))
jest.mock('@/components/ui/address-autocomplete', () => ({
  AddressAutocomplete: ({ name, value, onChange }: any) => (
    <input name={name} value={value} onChange={e => onChange(e.target.value)} />
  ),
}))
```

---

## Test Data

```ts
const EXISTING_CLIENTS = [
  {
    id: 'c-1', companyId: 'co-1', name: 'Acme Corp',
    address: '1 Corp Way', phone: null, email: null,
    accountType: null, accountNumber: null, createdAt: new Date(),
  },
]

const CREATED_SITE = {
  id: 'site-new', companyId: 'co-1', name: 'New Site',
  address: null, clientId: null, notes: null, createdAt: new Date(),
}
```

---

## New Test Cases to Add

### describe('new client detection')

```ts
it('does NOT show new-client-details when client field is empty', () => {
  render(<AddSiteForm clients={EXISTING_CLIENTS} />)
  expect(screen.queryByTestId('new-client-details')).not.toBeInTheDocument()
})

it('does NOT show new-client-details when typed name matches an existing client', async () => {
  render(<AddSiteForm clients={EXISTING_CLIENTS} />)
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'Acme Corp')
  expect(screen.queryByTestId('new-client-details')).not.toBeInTheDocument()
})

it('shows new-client-details when typed name does not match any existing client', async () => {
  render(<AddSiteForm clients={EXISTING_CLIENTS} />)
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'Brand New Client')
  expect(screen.getByTestId('new-client-details')).toBeInTheDocument()
})

it('hides new-client-details again if user clears the client field', async () => {
  render(<AddSiteForm clients={EXISTING_CLIENTS} />)
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'Brand New Client')
  expect(screen.getByTestId('new-client-details')).toBeInTheDocument()
  await userEvent.clear(screen.getByTestId('autocomplete-client_name'))
  expect(screen.queryByTestId('new-client-details')).not.toBeInTheDocument()
})
```

### describe('new client field inputs')

```ts
it('renders phone, email, account type, and account number inputs when new client section is visible', async () => {
  render(<AddSiteForm clients={EXISTING_CLIENTS} />)
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'New Client')
  expect(screen.getByTestId('new-client-phone')).toBeInTheDocument()
  expect(screen.getByTestId('new-client-email')).toBeInTheDocument()
  expect(screen.getByTestId('new-client-account-type')).toBeInTheDocument()
  expect(screen.getByTestId('new-client-account-number')).toBeInTheDocument()
})

it('account type select defaults to Residential', async () => {
  render(<AddSiteForm clients={EXISTING_CLIENTS} />)
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'New Client')
  expect(screen.getByTestId('new-client-account-type')).toHaveValue('Residential')
})
```

### describe('form submission with new client fields')

```ts
it('includes client phone and email in FormData when submitting a new client', async () => {
  mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
  render(<AddSiteForm clients={EXISTING_CLIENTS} />)

  await userEvent.type(screen.getByPlaceholderText(/acme hq/i), 'Test Site')
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'New Client')
  await userEvent.type(screen.getByTestId('new-client-phone'), '555-1234')
  await userEvent.type(screen.getByTestId('new-client-email'), 'new@test.com')
  await userEvent.click(screen.getByRole('button', { name: /add site/i }))

  const fd = mockCreateSite.mock.calls[0][1] as FormData
  expect(fd.get('client_phone')).toBe('555-1234')
  expect(fd.get('client_email')).toBe('new@test.com')
})

it('does NOT include client detail fields when linking an existing client', async () => {
  mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
  render(<AddSiteForm clients={EXISTING_CLIENTS} />)

  await userEvent.type(screen.getByPlaceholderText(/acme hq/i), 'Test Site')
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'Acme Corp')
  await userEvent.click(screen.getByRole('button', { name: /add site/i }))

  const fd = mockCreateSite.mock.calls[0][1] as FormData
  expect(fd.get('client_phone')).toBeNull()
  expect(fd.get('client_email')).toBeNull()
  expect(fd.get('client_account_type')).toBeNull()
  expect(fd.get('client_account_number')).toBeNull()
})
```

### describe('form reset clears new client fields')

```ts
it('new client fields are cleared when the form resets after successful submission', async () => {
  mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
  render(<AddSiteForm clients={EXISTING_CLIENTS} />)

  await userEvent.type(screen.getByPlaceholderText(/acme hq/i), 'Test Site')
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'Brand New')
  await userEvent.type(screen.getByTestId('new-client-phone'), '555-9999')
  await userEvent.click(screen.getByRole('button', { name: /add site/i }))

  await screen.findByTestId('add-site-equipment-phase')
  await userEvent.click(screen.getByTestId('add-site-skip-equipment'))

  // Back in phase 1 — new-client-details should not be showing
  await screen.findByRole('button', { name: /add site/i })
  expect(screen.queryByTestId('new-client-details')).not.toBeInTheDocument()
})
```

---

## Integration Test: createSite with new client fields

File: `__tests__/actions/create-site-client-fields.integration.test.ts`

```ts
import { withRollback, TEST_COMPANY_ID } from '@/test/helpers/db'
import { db } from '@/lib/db'
import { clients } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'

jest.mock('@/lib/tenant', () => ({
  getRequiredCompanyId: jest.fn().mockResolvedValue(TEST_COMPANY_ID),
}))

// Import after mock
const { createSite } = await import('@/actions/sites')

describe('createSite — new client with inline fields', () => {
  it('creates a new client with phone, email, accountType, accountNumber', async () => {
    await withRollback(async () => {
      const fd = new FormData()
      fd.set('name', 'E2E Integration Site')
      fd.set('client_name', 'Integration Test Client')
      fd.set('client_phone', '555-0001')
      fd.set('client_email', 'integration@test.com')
      fd.set('client_account_type', 'Commercial')
      fd.set('client_account_number', 'ACC-001')

      const result = await createSite(null, fd)
      expect(result.ok).toBe(true)

      const [client] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.companyId, TEST_COMPANY_ID), eq(clients.name, 'Integration Test Client')))
        .limit(1)

      expect(client.phone).toBe('555-0001')
      expect(client.email).toBe('integration@test.com')
      expect(client.accountType).toBe('Commercial')
      expect(client.accountNumber).toBe('ACC-001')
    })
  })

  it('links to existing client without overwriting their fields', async () => {
    await withRollback(async () => {
      // Pre-create a client
      const [existing] = await db
        .insert(clients)
        .values({ companyId: TEST_COMPANY_ID, name: 'Pre-Existing Client', phone: '555-original' })
        .returning()

      const fd = new FormData()
      fd.set('name', 'Linked Site')
      fd.set('client_name', 'Pre-Existing Client')
      fd.set('client_phone', 'should-be-ignored')

      const result = await createSite(null, fd)
      expect(result.ok).toBe(true)

      // Original client phone must not be overwritten
      const [check] = await db.select().from(clients).where(eq(clients.id, existing.id)).limit(1)
      expect(check.phone).toBe('555-original')
    })
  })
})
```

---

## Running Tests

```bash
# Unit tests only
npm test -- --testPathPattern="add-site-form"

# Integration tests only
npm test -- --testPathPattern="create-site-client-fields"

# Both
npm test -- --testPathPattern="(add-site-form|create-site-client-fields)"

# With coverage
npm test -- --coverage --coverageReporters=text --testPathPattern="(add-site-form|create-site-client-fields)"
```

---

## Coverage Target

≥ 90% on all metrics for:
- `app/sites/add-site-form.tsx`
- `actions/sites.ts` (createSite function)
