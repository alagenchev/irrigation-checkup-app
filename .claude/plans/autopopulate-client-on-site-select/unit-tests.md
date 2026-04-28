# Unit Test Instructions: autopopulate-client-on-site-select

## Goal

Verify that selecting a site in the irrigation form auto-populates all available client fields.

## Test File

**Extend**: `__tests__/irrigation-form.test.tsx` (if it exists) or create
`__tests__/autopopulate-client-on-site-select.test.tsx`

Check existing test patterns first — look at `__tests__/irrigation-form.test.tsx`.

---

## Key Mocks Required

```ts
jest.mock('@/actions/sites', () => ({
  getSiteEquipment: jest.fn().mockResolvedValue({
    controllers: [], zones: [], backflows: [], overview: null,
  }),
  getSites: jest.fn().mockResolvedValue([]),
}))
jest.mock('@/actions/inspections', () => ({
  saveInspection: jest.fn(),
}))
// Mock SiteSelector to expose an onSiteSelect callback
jest.mock('@/app/components/site-selector', () => ({
  SiteSelector: ({ onSiteSelect }: any) => (
    <button
      data-testid="mock-site-select"
      onClick={() => onSiteSelect(SITE_WITH_FULL_CLIENT)}
    >
      Select Site
    </button>
  ),
}))
```

---

## Test Data

```ts
const SITE_WITH_FULL_CLIENT = {
  id: 'site-1',
  companyId: 'co-1',
  name: 'Test Site',
  address: '1 Test St',
  clientId: 'client-1',
  notes: null,
  createdAt: new Date(),
  clientName:          'Acme Corp',
  clientAddress:       '99 Corp Ave',
  clientPhone:         '555-1234',
  clientEmail:         'acme@test.com',
  clientAccountType:   'Commercial',
  clientAccountNumber: 'ACC-001',
}

const SITE_WITH_PARTIAL_CLIENT = {
  ...SITE_WITH_FULL_CLIENT,
  clientEmail:         null,
  clientAccountType:   null,
  clientAccountNumber: null,
}

const SITE_NO_CLIENT = {
  ...SITE_WITH_FULL_CLIENT,
  clientName:          null,
  clientAddress:       null,
  clientPhone:         null,
  clientEmail:         null,
  clientAccountType:   null,
  clientAccountNumber: null,
}
```

---

## Test Cases

### describe('handleSiteSelect — client field population')

```ts
it('populates clientName and clientAddress when site has a client', async () => {
  // render form, trigger mock site select
  // assert form fields show Acme Corp and 99 Corp Ave
})

it('populates clientEmail when site client has an email', async () => {
  // render form, trigger mock site select with SITE_WITH_FULL_CLIENT
  // assert clientEmail field shows acme@test.com
})

it('populates accountType when site client has accountType', async () => {
  // assert accountType field shows Commercial
})

it('populates accountNumber when site client has accountNumber', async () => {
  // assert accountNumber field shows ACC-001
})

it('does not overwrite accountType or accountNumber when client fields are null', async () => {
  // trigger site select with SITE_WITH_PARTIAL_CLIENT (null accountType/accountNumber)
  // assert accountType stays at its default ('Commercial') and accountNumber stays ''
})

it('does not populate any client fields when site has no client', async () => {
  // trigger site select with SITE_NO_CLIENT
  // assert clientName, clientEmail, accountNumber remain empty
})
```

---

## Coverage Target

≥ 90% on the new branches in `handleSiteSelect()`.

## Running Tests

```bash
npm test -- --testPathPattern="(irrigation-form|autopopulate-client)"
```
