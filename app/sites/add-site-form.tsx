'use client'

import { useActionState, useState } from 'react'
import { createSite } from '@/actions/sites'
import { Autocomplete } from '@/components/ui/autocomplete'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import type { ActionResult, Client, Site } from '@/types'

interface AddSiteFormProps {
  clients: Client[]
}

export function AddSiteForm({ clients }: AddSiteFormProps) {
  const [state, formAction, isPending] = useActionState<ActionResult<Site> | null, FormData>(
    createSite,
    null,
  )

  const [clientName, setClientName] = useState('')
  const [address, setAddress] = useState('')

  const clientOptions = clients.map(c => ({ label: c.name, address: c.address ?? undefined }))

  return (
    <form action={formAction}>
      <div className="grid-2">
        <div className="field">
          <label>Site Name <span style={{ color: '#ef4444' }}>*</span></label>
          <input type="text" name="name" placeholder="e.g. Acme HQ – Building A" required />
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
          <input type="text" name="notes" placeholder="Optional notes" />
        </div>
      </div>

      {state && !state.ok && (
        <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{state.error}</p>
      )}
      {state?.ok && (
        <p style={{ color: '#22c55e', fontSize: 13, marginTop: 10 }}>Site added successfully.</p>
      )}

      <div style={{ marginTop: 16 }}>
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? 'Saving…' : 'Add Site'}
        </button>
      </div>
    </form>
  )
}
