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

  function handleDone() {
    setSiteName('')
    setAddress('')
    setClientName('')
    setNotes('')
    setError(null)
    setCreatedSite(null)
  }

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

    setCreatedSite({
      ...result.data,
      clientName:    clientName || null,
      clientAddress: address    || null,
    })
  }

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
}
