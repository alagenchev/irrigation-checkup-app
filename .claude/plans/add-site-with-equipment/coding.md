# Coding Instructions: add-site-with-equipment

## Goal

Convert `AddSiteForm` from a `useActionState` native form into a two-phase client component:

- **Phase 1** — site fields (name, address, client, notes) + "Add Site" button
- **Phase 2** — `SiteEquipmentEditor` for the newly created site, with a "Skip" button

The transition from phase 1 to phase 2 happens automatically after successful site creation. No navigation occurs — everything stays in the same card on the Sites page.

---

## Only file that changes

**`app/sites/add-site-form.tsx`** — complete rewrite of the component internals. The exported name `AddSiteForm` and prop interface `AddSiteFormProps` stay the same.

No schema changes, no new server actions, no new files.

---

## Implementation

### Phase state

Add a `createdSite` state. When it is `null`, phase 1 renders. When it is set, phase 2 renders.

```ts
const [createdSite, setCreatedSite] = useState<SiteWithClient | null>(null)
```

Import `SiteWithClient` from `@/actions/sites`.

---

### Phase 1 — site creation form

Replace `useActionState` with manual controlled state. `createSite` accepts a `FormData`, so build one in the submit handler.

```tsx
'use client'

import { useState } from 'react'
import { createSite } from '@/actions/sites'
import { SiteEquipmentEditor } from './site-equipment-editor'
import { Autocomplete } from '@/components/ui/autocomplete'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import type { SiteWithClient } from '@/actions/sites'
import type { Client } from '@/types'

interface AddSiteFormProps {
  clients: Client[]
}

export function AddSiteForm({ clients }: AddSiteFormProps) {
  const [siteName,    setSiteName]    = useState('')
  const [address,     setAddress]     = useState('')
  const [clientName,  setClientName]  = useState('')
  const [notes,       setNotes]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [createdSite, setCreatedSite] = useState<SiteWithClient | null>(null)

  const clientOptions = clients.map(c => ({ label: c.name, address: c.address ?? undefined }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const fd = new FormData()
    fd.set('name', siteName)
    if (address)    fd.set('address', address)
    if (clientName) fd.set('client_name', clientName)
    if (notes)      fd.set('notes', notes)

    const result = await createSite(null, fd)
    setSaving(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    // Transition to phase 2 — construct SiteWithClient from the returned Site + form state
    setCreatedSite({
      ...result.data,
      clientName:    clientName || null,
      clientAddress: address    || null,
    })
  }

  // Phase 2 — equipment editor
  if (createdSite) {
    return (
      <div data-testid="add-site-equipment-phase">
        <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 16 }}>
          Site <strong style={{ color: '#ffffff' }}>{createdSite.name}</strong> created.
          Add equipment now, or skip and add it later from the table.
        </p>
        <button
          data-testid="add-site-skip-equipment"
          className="btn btn-sm"
          style={{ marginBottom: 16 }}
          onClick={handleDone}
        >
          Skip — add equipment later
        </button>
        <SiteEquipmentEditor
          site={createdSite}
          onClose={handleDone}
          onSave={handleDone}
        />
      </div>
    )
  }

  // Phase 1 — site creation form
  return (
    <form data-testid="add-site-form" onSubmit={handleSubmit}>
      <div className="grid-2">
        <div className="field">
          <label>Site Name <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            type="text"
            name="name"
            placeholder="e.g. Acme HQ – Building A"
            required
            value={siteName}
            onChange={e => setSiteName(e.target.value)}
          />
        </div>
        <div className="field">
          <AddressAutocomplete
            name="address"
            value={address}
            onChange={setAddress}
            label="Address"
            placeholder="123 Main St, City, TX"
          />
        </div>
        <div className="field">
          <Autocomplete
            name="client_name"
            label="Client"
            value={clientName}
            onChange={setClientName}
            options={clientOptions}
            placeholder="Type or select a client"
          />
        </div>
        <div className="field">
          <label>Notes</label>
          <input
            type="text"
            name="notes"
            placeholder="Optional notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{error}</p>
      )}

      <div style={{ marginTop: 16 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Add Site'}
        </button>
      </div>
    </form>
  )

  function handleDone() {
    setSiteName('')
    setAddress('')
    setClientName('')
    setNotes('')
    setError(null)
    setCreatedSite(null)
  }
}
```

### Notes on the implementation

**`handleDone` placement**: Declare it inside the component body above both `return` statements (as a regular `function` declaration — hoisting means it can be called from `if (createdSite)` even though it's defined after).

**`createSite(null, fd)`**: The first argument is the previous state (`ActionResult<Site> | null`). Passing `null` is correct — the action doesn't use prev state, it accepts it only because it was wired via `useActionState` previously.

**`SiteWithClient` construction**: `result.data` is a `Site` (from the DB, fully typed). `clientName` and `clientAddress` come from the form inputs — they may differ slightly from the DB-stored client record (e.g. if the user typed a new client name), but they're only used for the equipment editor header display, which is cosmetic.

**`revalidatePath('/sites')` in `createSite`**: This fires automatically on success, so the sites table in `SitesPageClient` receives updated props from the server (Next.js App Router RSC re-render). The `AddSiteForm` keeps its local state (including `createdSite`) across this re-render because it's a client component.

**Equipment is always empty for new sites**: `SiteEquipmentEditor` initialises controllers/zones/backflows as empty arrays — correct for a brand-new site with no prior data.

---

## Pre-commit checklist

```bash
npm run build   # must pass
npm test        # must pass — existing tests for SitesPageClient mock AddSiteForm, so they're unaffected
```

No migration, no new files.

---

## Files Modified

| File | Change |
|---|---|
| `app/sites/add-site-form.tsx` | Replace `useActionState` with controlled state + two-phase render |
