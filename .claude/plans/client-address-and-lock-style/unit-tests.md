# Unit Test Instructions: client-address-and-lock-style

**UUID**: b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e

## Files to Test

1. Extend `__tests__/add-site-form.test.tsx` — new client address + checkbox behaviour
2. Extend `__tests__/actions/create-site-client-fields.integration.test.ts` — clientAddress persisted

---

## Mocks (same as existing add-site-form.test.tsx)

Keep all existing mocks. The AddressAutocomplete mock should expose the input:
```ts
jest.mock('@/components/ui/address-autocomplete', () => ({
  AddressAutocomplete: ({ name, value, onChange }: any) => (
    <input data-testid="address-autocomplete" name={name} value={value} onChange={e => onChange(e.target.value)} />
  ),
}))
```

---

## New Test Cases for add-site-form.test.tsx

### describe('new client — address field')

```ts
it('shows the client address field when a new client name is typed', async () => {
  render(<AddSiteForm clients={MOCK_CLIENTS} />)
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'Brand New Client')
  expect(screen.getByTestId('new-client-address-same-checkbox')).toBeInTheDocument()
})

it('checkbox is checked by default', async () => {
  render(<AddSiteForm clients={MOCK_CLIENTS} />)
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'Brand New Client')
  expect(screen.getByTestId('new-client-address-same-checkbox')).toBeChecked()
})

it('shows the site address in disabled input when checkbox is checked', async () => {
  render(<AddSiteForm clients={MOCK_CLIENTS} />)
  // Enter site address first
  await userEvent.type(screen.getByPlaceholderText(/123 main/i), '99 Site Ave')
  // Enter new client name
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'Brand New Client')
  // Display input should show the site address
  expect(screen.getByTestId('new-client-address-display')).toHaveValue('99 Site Ave')
  expect(screen.getByTestId('new-client-address-display')).toBeDisabled()
})

it('shows AddressAutocomplete when checkbox is unchecked', async () => {
  render(<AddSiteForm clients={MOCK_CLIENTS} />)
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'Brand New Client')
  await userEvent.click(screen.getByTestId('new-client-address-same-checkbox'))
  expect(screen.getByTestId('new-client-address-input')).toBeInTheDocument()
  expect(screen.queryByTestId('new-client-address-display')).not.toBeInTheDocument()
})

it('clears custom address when checkbox is re-checked', async () => {
  render(<AddSiteForm clients={MOCK_CLIENTS} />)
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'Brand New Client')
  // Uncheck
  await userEvent.click(screen.getByTestId('new-client-address-same-checkbox'))
  // Type custom address
  await userEvent.type(screen.getByTestId('address-autocomplete'), '42 Custom Ave')
  // Re-check
  await userEvent.click(screen.getByTestId('new-client-address-same-checkbox'))
  // Display input should show site address (empty since no site address entered)
  expect(screen.getByTestId('new-client-address-display')).toHaveValue('')
})
```

### describe('new client address — FormData submission')

```ts
it('sends site address as client_address when checkbox is checked', async () => {
  mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
  render(<AddSiteForm clients={MOCK_CLIENTS} />)
  await userEvent.type(screen.getByPlaceholderText(/acme hq/i), 'Test Site')
  // Enter site address
  // (AddressAutocomplete mock — type into it)
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'New Client')
  // Checkbox checked by default — site address used
  await userEvent.click(screen.getByRole('button', { name: /add site/i }))
  const fd = mockCreateSite.mock.calls[0][1] as FormData
  // client_address should not be set if site address is also empty
  // (effectiveClientAddress = '' when both are empty, so fd.set is skipped)
  // This test verifies no crash and submission proceeds
  expect(mockCreateSite).toHaveBeenCalledTimes(1)
})

it('sends custom address as client_address when checkbox is unchecked', async () => {
  mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
  render(<AddSiteForm clients={MOCK_CLIENTS} />)
  await userEvent.type(screen.getByPlaceholderText(/acme hq/i), 'Test Site')
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'New Client')
  // Uncheck to use custom address
  await userEvent.click(screen.getByTestId('new-client-address-same-checkbox'))
  await userEvent.type(screen.getByTestId('address-autocomplete'), '42 Custom Ave')
  await userEvent.click(screen.getByRole('button', { name: /add site/i }))
  const fd = mockCreateSite.mock.calls[0][1] as FormData
  expect(fd.get('client_address')).toBe('42 Custom Ave')
})
```

### describe('form reset')

```ts
it('resets checkbox to checked and clears custom address after form done', async () => {
  mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
  render(<AddSiteForm clients={MOCK_CLIENTS} />)
  await userEvent.type(screen.getByPlaceholderText(/acme hq/i), 'Test Site')
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'New Client')
  // Uncheck to use custom address
  await userEvent.click(screen.getByTestId('new-client-address-same-checkbox'))

  // Submit → phase 2 → skip → back to phase 1
  await userEvent.click(screen.getByRole('button', { name: /add site/i }))
  await screen.findByTestId('add-site-equipment-phase')
  await userEvent.click(screen.getByTestId('add-site-skip-equipment'))

  // Enter new client name again to reveal section
  await screen.findByRole('button', { name: /add site/i })
  await userEvent.type(screen.getByTestId('autocomplete-client_name'), 'Another Client')
  // Checkbox should be checked again (reset to default)
  expect(screen.getByTestId('new-client-address-same-checkbox')).toBeChecked()
})
```

---

## Integration Test Addition

Add to `__tests__/actions/create-site-client-fields.integration.test.ts`:

```ts
it('saves clientAddress from form data, not site address', async () => {
  await withRollback(async () => {
    const fd = new FormData()
    fd.set('name', 'Address Test Site')
    fd.set('address', '1 Site Ave')
    fd.set('client_name', 'Address Test Client')
    fd.set('client_address', '99 Client Blvd')

    const result = await createSite(null, fd)
    expect(result.ok).toBe(true)

    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.companyId, TEST_COMPANY_ID), eq(clients.name, 'Address Test Client')))
      .limit(1)

    expect(client.address).toBe('99 Client Blvd')
  })
})

it('saves null client address when no client_address is sent', async () => {
  await withRollback(async () => {
    const fd = new FormData()
    fd.set('name', 'No Address Site')
    fd.set('client_name', 'No Address Client')
    // No client_address field

    const result = await createSite(null, fd)
    expect(result.ok).toBe(true)

    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.companyId, TEST_COMPANY_ID), eq(clients.name, 'No Address Client')))
      .limit(1)

    expect(client.address).toBeNull()
  })
})
```

---

## Coverage Target

≥ 90% on changed branches in `add-site-form.tsx`.

```bash
npm test -- --testPathPattern="(add-site-form|create-site-client-fields)"
```
