# context.md: client-address-and-lock-style

**UUID**: b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e

## What Was Built

Two fixes bundled together:

### 1. Client address field in add-site form
When adding a new site with a new client, a "Client Address" field is now shown in the
"New Client Details" section. A "Same as site address" checkbox (checked by default) mirrors
the site address into the client address. Unchecking reveals an independent AddressAutocomplete.

The `createSite` action now accepts and persists `client_address` from the form.

### 2. Locked client field styling in new inspection form
When a site with a linked client is selected on the new inspection form, the client fields
(Name, Address, Email) switch to read-only mode. Previously they used `opacity: 0.6` which
made the values look like placeholder/greyed-out text. Now they use `background: #2c2c2e`
(grey fill) with `color: #ffffff` (full white text) so content is clearly readable.

## Files Modified

- `app/sites/add-site-form.tsx` — added `clientAddress` + `clientAddressSameAsSite` state, "Client Address" field with checkbox, checkbox+label on same row
- `actions/sites.ts` — parses `client_address` from FormData; uses `clientAddress` (not site `address`) when inserting new client
- `lib/validators.ts` — added `clientAddress: z.string().max(500).optional()` to `createSiteSchema`
- `app/irrigation-form.tsx` — replaced `opacity: 0.6` with `background: #2c2c2e; color: #ffffff` on all three locked client fields

## Test IDs (data-testid attributes)

- `new-client-address-same-checkbox-label` — the `<label>` wrapping the checkbox + text
- `new-client-address-same-checkbox` — the checkbox input itself
- `new-client-address-display` — disabled input showing site address when checkbox is checked
- `new-client-address-input` — wrapper div around AddressAutocomplete when checkbox is unchecked

Existing locked field test IDs (unchanged):
- `client-name-locked` — client name readonly input in irrigation form
- `client-address-locked` — client address readonly input in irrigation form
- `client-email-locked` — client email readonly input in irrigation form

## Key Behaviour

- `clientAddressSameAsSite` defaults to `true`
- `effectiveClientAddress = clientAddressSameAsSite ? address : clientAddress`
- When checkbox re-checked after being unchecked: `clientAddress` is cleared back to `''`
- `handleDone()` resets both `clientAddressSameAsSite = true` and `clientAddress = ''`
- Locked fields in irrigation form: click any locked field to unlock all client fields for editing
