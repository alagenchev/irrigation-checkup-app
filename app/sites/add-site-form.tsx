'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { createSite } from '@/actions/sites'
import { createSiteMap, saveSiteMapDrawing } from '@/actions/site-maps'
import { SiteEquipmentEditor } from './site-equipment-editor'

const MapCanvas = dynamic(
  () => import('@/app/components/map/map-canvas').then(m => ({ default: m.MapCanvas })),
  { ssr: false, loading: () => <div style={{ color: '#a1a1aa', padding: 16 }}>Loading map…</div> },
)
import { Autocomplete } from '@/components/ui/autocomplete'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import type { SiteWithClient } from '@/actions/sites'
import type { Client } from '@/types'

const ACCOUNT_TYPES = ['Commercial', 'Residential', 'HOA', 'Municipal']

interface AddSiteFormProps {
  clients: Client[]
}

export function AddSiteForm({ clients }: AddSiteFormProps) {
  const [siteName,                setSiteName]                = useState('')
  const [address,                 setAddress]                 = useState('')
  const [clientName,              setClientName]              = useState('')
  const [clientPhone,             setClientPhone]             = useState('')
  const [clientEmail,             setClientEmail]             = useState('')
  const [clientAccountType,       setClientAccountType]       = useState('Residential')
  const [clientAccountNumber,     setClientAccountNumber]     = useState('')
  const [clientAddressSameAsSite, setClientAddressSameAsSite] = useState(true)
  const [clientAddress,           setClientAddress]           = useState('')
  const [notes,                   setNotes]                   = useState('')
  const [saving,                  setSaving]                  = useState(false)
  const [error,                   setError]                   = useState<string | null>(null)
  const [createdSite,             setCreatedSite]             = useState<SiteWithClient | null>(null)
  const [drawing,                 setDrawing]                 = useState<GeoJSON.FeatureCollection | null>(null)

  const clientOptions = clients.map(c => ({ label: c.name, value: c.id, address: c.address ?? undefined }))
  const isNewClient = clientName.trim() !== '' && !clients.some(c => c.name === clientName)
  const effectiveClientAddress = clientAddressSameAsSite ? address : clientAddress

  async function handleGeolocate([lng, lat]: [number, number]) {
    const res = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`)
    if (!res.ok) return
    const results: string[] = await res.json()
    if (results[0]) setAddress(prev => prev || results[0])
  }

  function handleDone() {
    setSiteName('')
    setAddress('')
    setClientName('')
    setClientPhone('')
    setClientEmail('')
    setClientAccountType('Residential')
    setClientAccountNumber('')
    setClientAddressSameAsSite(true)
    setClientAddress('')
    setNotes('')
    setError(null)
    setCreatedSite(null)
    setDrawing(null)
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

    if (isNewClient) {
      if (effectiveClientAddress) fd.set('client_address', effectiveClientAddress)
      if (clientPhone)            fd.set('client_phone', clientPhone)
      if (clientEmail)            fd.set('client_email', clientEmail)
      if (clientAccountType)      fd.set('client_account_type', clientAccountType)
      if (clientAccountNumber)    fd.set('client_account_number', clientAccountNumber)
    }

    const result = await createSite(null, fd)
    setSaving(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    const newSite = result.data
    if (drawing && drawing.features.length > 0 && newSite?.id) {
      const map = await createSiteMap(newSite.id, 'Map 1')
      await saveSiteMapDrawing(map.id, drawing)
    }

    setCreatedSite({
      ...newSite,
      clientName:          clientName             || null,
      clientAddress:       effectiveClientAddress || null,
      clientPhone:         clientPhone            || null,
      clientEmail:         clientEmail            || null,
      clientAccountType:   clientAccountType      || null,
      clientAccountNumber: clientAccountNumber    || null,
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
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 420px', minWidth: 0 }}>
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

          {isNewClient && (
            <div data-testid="new-client-details" style={{ marginTop: 16, padding: '14px 16px', border: '1px solid #3a3a3c', borderRadius: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px 0' }}>
                New Client Details
              </p>
              <div className="field" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <label style={{ margin: 0 }}>Client Address</label>
                  <label data-testid="new-client-address-same-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#a1a1aa', fontWeight: 400, cursor: 'pointer', margin: 0 }}>
                    <input
                      data-testid="new-client-address-same-checkbox"
                      type="checkbox"
                      checked={clientAddressSameAsSite}
                      onChange={e => {
                        setClientAddressSameAsSite(e.target.checked)
                        if (e.target.checked) setClientAddress('')
                      }}
                    />
                    Same as site address
                  </label>
                </div>
                {clientAddressSameAsSite ? (
                  <input
                    data-testid="new-client-address-display"
                    type="text"
                    value={address}
                    readOnly
                    disabled
                    placeholder="Enter site address above first"
                    style={{ opacity: 0.5 }}
                  />
                ) : (
                  <div data-testid="new-client-address-input">
                    <AddressAutocomplete
                      name="client_address"
                      value={clientAddress}
                      onChange={setClientAddress}
                      placeholder="123 Main St, City, TX"
                    />
                  </div>
                )}
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Phone</label>
                  <input
                    data-testid="new-client-phone"
                    type="text"
                    placeholder="(555) 000-0000"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input
                    data-testid="new-client-email"
                    type="email"
                    placeholder="client@email.com"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Account Type</label>
                  <select data-testid="new-client-account-type" value={clientAccountType} onChange={e => setClientAccountType(e.target.value)}>
                    {ACCOUNT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Account #</label>
                  <input
                    data-testid="new-client-account-number"
                    type="text"
                    placeholder="Account number"
                    value={clientAccountNumber}
                    onChange={e => setClientAccountNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{error}</p>
          )}

          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Add Site'}
            </button>
          </div>
        </div>
        <div style={{ flex: '1 1 auto', minWidth: 280 }}>
          <MapCanvas
            onGeolocate={handleGeolocate}
            initialDrawing={drawing}
            onDrawingChange={setDrawing}
            height={360}
          />
        </div>
      </div>
    </form>
  )
}
