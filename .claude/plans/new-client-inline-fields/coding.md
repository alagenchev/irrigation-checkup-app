# Coding Spec: new-client-inline-fields

**UUID**: e9f0a1b2-c3d4-4e5f-9a0b-1c2d3e4f5a6b
**Status**: Implemented (code already written — this file is for agent reference)

## Feature Description

When adding a new site at `/sites`, the Client field is an autocomplete backed by existing clients.
If the user types a name that doesn't match any existing client, a "New Client Details" section
appears below with fields for phone, email, account type, and account number.
On submit, the new client is created with all provided fields, then linked to the site.

## Changed Files

1. `app/sites/add-site-form.tsx`
2. `lib/validators.ts`
3. `actions/sites.ts`
4. `components/ui/autocomplete.tsx`
5. `app/components/site-selector.tsx`

## Key Behaviour

- `isNewClient = clientName.trim() !== '' && !clients.some(c => c.name === clientName)`
- "New Client Details" div (`data-testid="new-client-details"`) renders only when `isNewClient` is true
- Client fields are only appended to FormData when `isNewClient` is true
- When linking an existing client, the extra fields are ignored entirely
- All new client fields are optional (only name is required, which comes from the existing `client_name` field)
- Resetting the form (handleDone) clears all new client state back to defaults
