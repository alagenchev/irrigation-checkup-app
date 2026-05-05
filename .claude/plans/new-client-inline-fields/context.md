# context.md: new-client-inline-fields

**UUID**: e9f0a1b2-c3d4-4e5f-9a0b-1c2d3e4f5a6b
**Task**: new-client-inline-fields

## What Was Built

When adding a new site, if the user types a client name that does not match any existing client,
a "New Client Details" section is revealed inline below the client field. This lets users fill in
phone, email, account type, and account number for the new client without navigating away.

If the typed client name matches an existing client, the section stays hidden and the existing
client is linked as before.

## Architecture Decisions

- `isNewClient` is a derived boolean: `clientName.trim() !== '' && !clients.some(c => c.name === clientName)`
- New client fields are only sent in FormData when `isNewClient` is true — existing client links are unaffected
- `createSiteSchema` extended with optional client fields; they are only used in the `else` branch of the existing-vs-new client resolution in `createSite`
- `AutocompleteOption` gained a `value?: string` field to allow unique React keys when labels collide (bug fix bundled with this task)
- `siteToOption` now sets `value: site.id` so the autocomplete key is stable even if two sites share a name

## Files Created/Modified

- `app/sites/add-site-form.tsx` — added 5 state vars, `isNewClient` derived boolean, conditional "New Client Details" section, data-testid attributes
- `lib/validators.ts` — extended `createSiteSchema` with `clientPhone`, `clientEmail`, `clientAccountType`, `clientAccountNumber`
- `actions/sites.ts` — parses 4 new FormData fields; passes them to `db.insert(clients)` when creating a new client
- `components/ui/autocomplete.tsx` — added `value?: string` to `AutocompleteOption`; key changed to `opt.value ?? opt.label`
- `app/components/site-selector.tsx` — `siteToOption` now sets `value: site.id`

## Test IDs (data-testid attributes)

Existing (unchanged):
- `add-site-form` — the phase 1 `<form>` element
- `add-site-equipment-phase` — the phase 2 wrapper div
- `add-site-skip-equipment` — Skip button in phase 2

New (this task):
- `new-client-details` — the revealed "New Client Details" container div
- `new-client-phone` — phone input
- `new-client-email` — email input
- `new-client-account-type` — account type `<select>`
- `new-client-account-number` — account number input
