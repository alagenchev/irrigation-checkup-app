# Coding Spec: autopopulate-client-on-site-select

**UUID**: c4d5e6f7-a8b9-4c0d-1e2f-3a4b5c6d7e8f
**Task**: autopopulate-client-on-site-select

## Problem

When a user selects an existing site in the new inspection form (`app/irrigation-form.tsx`),
only `clientName` and `clientAddress` are auto-populated. `clientEmail`, `accountType`, and
`accountNumber` are left blank even though the client record has that data.

## Root Cause

Two gaps:

1. `SiteWithClient` type and `getSites()` query only fetch `clientName` and `clientAddress`
   from the clients table — phone, email, accountType, accountNumber are never loaded.

2. `handleSiteSelect()` in `irrigation-form.tsx` only calls `setField` for name and address —
   even if those fields existed on the type, they wouldn't be applied.

## Changes Required

### 1. `actions/sites.ts`

**Extend `SiteWithClient` type** (line 12):
```ts
export type SiteWithClient = Site & {
  clientName:          string | null
  clientAddress:       string | null
  clientPhone:         string | null
  clientEmail:         string | null
  clientAccountType:   string | null
  clientAccountNumber: string | null
}
```

**Extend `getSites()` query** to also select the new columns from the clients table join:
```ts
clientPhone:         clients.phone,
clientEmail:         clients.email,
clientAccountType:   clients.accountType,
clientAccountNumber: clients.accountNumber,
```

### 2. `app/irrigation-form.tsx`

**In `handleSiteSelect()`** (around line 124), add after the existing clientName/clientAddress lines:
```ts
if (site.clientEmail)         setField('clientEmail',   site.clientEmail)
if (site.clientAccountType)   setField('accountType',   site.clientAccountType)
if (site.clientAccountNumber) setField('accountNumber', site.clientAccountNumber)
```

Note: `clientPhone` is intentionally not populated — the new inspection form has no phone field
for the client section. (It's only on the /clients page and the add-site form.)

## Scope

- No schema changes (DB is unchanged)
- No new components
- No new server actions
- No changes to SiteSelector component
- TypeScript must pass (`npm run build`)
- Existing tests must not regress (`npm test`)

## data-testid

No new interactive elements — no new data-testid attributes needed.

## context.md updates

Document: files modified, the fields now auto-populated, and why phone is intentionally excluded.
