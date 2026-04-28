# Coding Spec: client-address-and-lock-style

**UUID**: b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e
**Status**: Implemented — agents review/test only

## Changes Summary

### add-site form — client address field
- State: `clientAddress: string`, `clientAddressSameAsSite: boolean` (default true)
- Derived: `effectiveClientAddress = clientAddressSameAsSite ? address : clientAddress`
- UI: "Client Address" label and "☑ Same as site address" checkbox on the SAME row
- When checked: disabled input shows site address value
- When unchecked: AddressAutocomplete for custom address
- FormData: sends `client_address = effectiveClientAddress` when `isNewClient`
- Reset: `handleDone()` clears both new state vars

### createSite action
- Parses `client_address` from FormData → `clientAddress`
- Passes `address: clientAddress` to `db.insert(clients)` (was hardcoded to site `address`)

### validator
- `createSiteSchema` gains `clientAddress: z.string().max(500).optional()`

### irrigation form — locked field styling
- All 3 client locked fields: `opacity: 0.6` → `background: #2c2c2e; color: #ffffff`
