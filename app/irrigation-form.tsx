'use client'

import React, { useState, useRef } from 'react'
import { Autocomplete } from '@/components/ui/autocomplete'
import { ensureClientExists } from '@/actions/clients'
import { saveInspection } from '@/actions/save-inspection'
import { uploadZonePhoto } from '@/actions/upload'
import type { Client, CompanySettings, Inspector, IrrigationFormInitialData, ControllerFormData, ZoneFormData, BackflowFormData, QuoteItemFormData } from '@/types'
import type { SiteWithClient } from '@/actions/sites'

const ISSUE_TYPES = [
  'Runoff','Overspray','Lower Head','Raise Head','Obstructions','Adjust Nozzle',
  'Poor Coverage','Replace Valve','Main Line Leak','Pressure Issue','Misaligned Head',
  'Drip Tubing Leak','Replace 4" Popup','Replace 6" Popup','Replace 12" Popup',
  'Replace Solenoid','Zone Not Working','Lateral Pipe Leak','Replace Diaphragm',
  'Replace 1/2" Rotor','Replace 3/4" Rotor','Replace Drip Emitter',
  'Replace Spray Nozzle','Replace Rotator Nozzle',
]

const LANDSCAPE_TYPES = ['Full-sun turf','Shade turf','Low demand beds','High demand beds','Trees','Shrubs','Ground cover','Slope']
const IRRIGATION_TYPES = ['Rotor','MPR spray','Fan spray','Rotator nozzle','Drip','Micro spray','Bubbler']

// Aliases to the canonical form data types — never duplicate inline to avoid drift
type Controller = ControllerFormData
type Zone       = ZoneFormData
type Backflow   = BackflowFormData
type QuoteItem  = QuoteItemFormData

interface IrrigationFormProps {
  clients:      Client[]
  sites:        SiteWithClient[]
  company:      CompanySettings
  inspectors:   Inspector[]
  initialData?: IrrigationFormInitialData
}

function today() { return new Date().toISOString().split('T')[0] }

export function IrrigationForm({ clients, sites, company, inspectors, initialData }: IrrigationFormProps) {
  // ── ID COUNTER (useRef so lazy initializers don't conflict with loaded IDs) ─
  const maxInitialId = initialData
    ? Math.max(
        0,
        ...initialData.controllers.map(c => c.id),
        ...initialData.zones.map(z => z.id),
        ...initialData.backflows.map(b => b.id),
        ...initialData.quoteItems.map(q => q.id),
      )
    : 0
  const nextIdRef = useRef(maxInitialId + 1)
  const uid = () => nextIdRef.current++

  const isDetailPage = initialData !== undefined

  const [form, setForm] = useState(() => initialData?.form ?? {
    clientName: '', clientAddress: '', siteName: '', siteAddress: '',
    datePerformed: today(), inspectionType: 'Repair Inspection', accountType: 'Commercial',
    accountNumber: '', status: 'New', dueDate: today(), inspectorId: '',
    repairEstimate: '', inspectionNotes: '', internalNotes: '',
    staticPressure: '', backflowInstalled: false, backflowServiceable: false,
    isolationValve: false, systemNotes: '',
  })

  const [controllers, setControllers] = useState<Controller[]>(() =>
    initialData?.controllers ?? [
      { id: uid(), location: '', manufacturer: '', model: '', sensors: '', numZones: '0', masterValve: false, masterValveNotes: '', notes: '' }
    ]
  )
  const [zones, setZones] = useState<Zone[]>(() =>
    initialData?.zones ?? [
      { id: uid(), zoneNum: '1', controller: '', description: '', landscapeTypes: [], irrigationTypes: [], notes: '', photoData: [] },
      { id: uid(), zoneNum: '2', controller: '', description: '', landscapeTypes: [], irrigationTypes: [], notes: '', photoData: [] },
    ]
  )
  const [backflows, setBackflows]   = useState<Backflow[]>(() => initialData?.backflows ?? [])
  const [zoneIssues, setZoneIssues] = useState<Record<string, string[]>>(() => initialData?.zoneIssues ?? {})
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>(() =>
    initialData?.quoteItems ?? [
      { id: uid(), location: '', item: '', description: '', price: '', qty: '1' }
    ]
  )
  const [loading,        setLoading]        = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [saveMsg,        setSaveMsg]        = useState<{ ok: boolean; text: string } | null>(null)
  const [fieldErrors,    setFieldErrors]    = useState<Record<string, string>>({})
  const [savedOk,        setSavedOk]        = useState(false)
  const [mode,           setMode]           = useState<'edit' | 'readonly' | 'preview'>(
    initialData ? 'readonly' : 'edit'
  )
  const [previewFrom,    setPreviewFrom]    = useState<'edit' | 'readonly'>('edit')
  const [previewHtml,    setPreviewHtml]    = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [geoLoading,     setGeoLoading]     = useState(false)
  const [geoResults,     setGeoResults]     = useState<string[]>([])
  const [geoError,       setGeoError]       = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState<Record<number, boolean>>({})
  const [photoErrors,    setPhotoErrors]    = useState<Record<number, string>>({})
  const [photoThumbs,    setPhotoThumbs]    = useState<Record<number, string[]>>({})
  const photoRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // ── AUTOCOMPLETE DATA ──────────────────────────────────────────────────────

  const clientOptions = clients.map(c => ({ label: c.name, address: c.address ?? undefined }))
  const siteOptions = sites.map(s => ({
    label:         s.name,
    address:       s.address       ?? undefined,
    clientName:    s.clientName    ?? undefined,
    clientAddress: s.clientAddress ?? undefined,
  }))

  const selectedInspector = inspectors.find(i => i.id === form.inspectorId) ?? null

  // ── FIELD HANDLERS ──────────────────────────────────────────────────────

  function setField(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
    setFieldErrors(e => { const { [key]: _, ...rest } = e; return rest })
  }

  // ── CONTROLLERS ──────────────────────────────────────────────────────────

  function addController() {
    setControllers(c => [...c, { id: uid(), location: '', manufacturer: '', model: '', sensors: '', numZones: '0', masterValve: false, masterValveNotes: '', notes: '' }])
  }
  function updateController(id: number, key: keyof Controller, value: string | boolean) {
    setControllers(c => c.map(ct => ct.id === id ? { ...ct, [key]: value } : ct))
  }
  function removeController(id: number) {
    setControllers(c => c.filter(ct => ct.id !== id))
  }

  // ── ZONES ────────────────────────────────────────────────────────────────

  function addZone() {
    const num = String(zones.length + 1)
    setZones(z => [...z, { id: uid(), zoneNum: num, controller: '', description: '', landscapeTypes: [], irrigationTypes: [], notes: '', photoData: [] }])
  }
  function updateZone(id: number, key: keyof Zone, value: string | string[]) {
    setZones(z => z.map(zn => zn.id === id ? { ...zn, [key]: value } : zn))
  }
  function addZonePhotoUrl(id: number, url: string) {
    setZones(zns => zns.map(zn => zn.id === id ? { ...zn, photoData: [...zn.photoData, { url, annotation: '' }] } : zn))
  }

  function updateZonePhotoAnnotation(zoneId: number, photoIdx: number, annotation: string) {
    setZones(zns => zns.map(zn =>
      zn.id === zoneId
        ? { ...zn, photoData: zn.photoData.map((p, i) => i === photoIdx ? { ...p, annotation } : p) }
        : zn
    ))
  }
  function removeZone(id: number) {
    setZones(z => z.filter(zn => zn.id !== id))
  }
  function toggleMultiSelect(id: number, field: 'landscapeTypes' | 'irrigationTypes', value: string) {
    setZones(z => z.map(zn => {
      if (zn.id !== id) return zn
      const arr = zn[field]
      return { ...zn, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }
    }))
  }

  // ── BACKFLOWS ────────────────────────────────────────────────────────────

  function addBackflow() {
    setBackflows(b => [...b, { id: uid(), manufacturer: '', type: '', model: '', size: '' }])
  }
  function updateBackflow(id: number, key: keyof Backflow, value: string) {
    setBackflows(b => b.map(bf => bf.id === id ? { ...bf, [key]: value } : bf))
  }
  function removeBackflow(id: number) {
    setBackflows(b => b.filter(bf => bf.id !== id))
  }

  // ── ZONE ISSUES ──────────────────────────────────────────────────────────

  function toggleIssue(zoneNum: string, issue: string) {
    setZoneIssues(zi => {
      const current = zi[zoneNum] || []
      return {
        ...zi,
        [zoneNum]: current.includes(issue) ? current.filter(i => i !== issue) : [...current, issue],
      }
    })
  }

  // ── GEOLOCATION ──────────────────────────────────────────────────────────

  async function handleGetLocation() {
    setGeoLoading(true)
    setGeoResults([])
    setGeoError(null)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
      const res = await fetch(`/api/geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
      if (!res.ok) throw new Error('Geocoding failed')
      const addresses: string[] = await res.json()
      if (addresses.length === 0) throw new Error('No address found at this location')
      setGeoResults(addresses)
    } catch (err: unknown) {
      setGeoError(err instanceof Error ? err.message : 'Location unavailable')
    } finally {
      setGeoLoading(false)
    }
  }

  function selectGeoResult(address: string) {
    setField('siteAddress', address)
    setGeoResults([])
    setGeoError(null)
  }

  // ── QUOTE ITEMS ──────────────────────────────────────────────────────────

  function addQuoteItem() {
    setQuoteItems(q => [...q, { id: uid(), location: '', item: '', description: '', price: '', qty: '1' }])
  }
  function updateQuoteItem(id: number, key: keyof QuoteItem, value: string) {
    setQuoteItems(q => q.map(qi => qi.id === id ? { ...qi, [key]: value } : qi))
  }
  function removeQuoteItem(id: number) {
    setQuoteItems(q => q.filter(qi => qi.id !== id))
  }

  const quoteTotal = quoteItems.reduce((sum, qi) => sum + (parseFloat(qi.price) || 0) * (parseInt(qi.qty) || 1), 0)

  // ── SAVE ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    const errs: Record<string, string> = {}
    if (!form.siteName.trim())   errs.siteName      = 'Required'
    if (!form.datePerformed)     errs.datePerformed  = 'Required'
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    setSaving(true)
    setSaveMsg(null)
    try {
      const result = await saveInspection({
        siteName:      form.siteName.trim(),
        siteAddress:   form.siteAddress.trim()  || undefined,
        clientName:    form.clientName.trim()   || undefined,
        clientAddress: form.clientAddress.trim() || undefined,
        inspectorId:   form.inspectorId || undefined,

        datePerformed:   form.datePerformed,
        inspectionType:  form.inspectionType,
        accountType:     form.accountType     || undefined,
        accountNumber:   form.accountNumber   || undefined,
        status:          form.status,
        dueDate:         form.dueDate         || undefined,
        repairEstimate:  form.repairEstimate  || undefined,
        inspectionNotes: form.inspectionNotes || undefined,
        internalNotes:   form.internalNotes   || undefined,

        staticPressure:      form.staticPressure || undefined,
        backflowInstalled:   form.backflowInstalled,
        backflowServiceable: form.backflowServiceable,
        isolationValve:      form.isolationValve,
        systemNotes:         form.systemNotes || undefined,

        controllers,
        zones,
        backflows,
        zoneIssues,
        quoteItems,
      })

      if (result.ok) {
        setSavedOk(true)
        setSaveMsg({ ok: true, text: 'Saved successfully.' })
        if (isDetailPage) setMode('readonly')
      } else {
        setSaveMsg({ ok: false, text: result.error })
      }
    } catch {
      setSaveMsg({ ok: false, text: 'An unexpected error occurred.' })
    } finally {
      setSaving(false)
    }
  }

  // ── REPORT HELPERS ───────────────────────────────────────────────────────

  function buildReportFormData(): FormData {
    const fd = new FormData()
    Object.entries(company).forEach(([k, v]) => { if (v !== null) fd.append(k, String(v)) })
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)))
    fd.append('inspectorName', selectedInspector ? `${selectedInspector.firstName} ${selectedInspector.lastName}` : '')
    fd.append('inspectorLicenseNum', selectedInspector?.licenseNum ?? '')
    fd.append('controllers', JSON.stringify(controllers))
    fd.append('zones',       JSON.stringify(zones.map(z => ({
      ...z,
      zonePhotos: { zoneNum: z.zoneNum, photos: z.photoData }
    }))))
    fd.append('backflows',   JSON.stringify(backflows))
    fd.append('zoneIssues',  JSON.stringify(
      zones.map(z => ({ zoneNum: z.zoneNum, issues: zoneIssues[z.zoneNum] || [] }))
    ))
    fd.append('quoteItems', JSON.stringify(
      quoteItems.map((qi, i) => ({
        num: i + 1, location: qi.location, item: qi.item,
        description: qi.description, price: parseFloat(qi.price) || 0, qty: parseInt(qi.qty) || 1,
      }))
    ))
    zones.forEach(z => {
      const keys = [`zone_upload_${z.id}`, `zone_capture_${z.id}`]
      keys.forEach(key => {
        const input = photoRefs.current[key]
        if (input?.files) {
          Array.from(input.files).forEach(file => fd.append(`photo_zone_${z.zoneNum}`, file))
        }
      })
    })
    return fd
  }

  async function handlePreview() {
    setPreviewFrom(mode as 'edit' | 'readonly')
    setPreviewLoading(true)
    try {
      const res = await fetch('/api/preview-report', { method: 'POST', body: buildReportFormData() })
      if (!res.ok) throw new Error('Failed to load preview')
      setPreviewHtml(await res.text())
      setMode('preview')
    } catch (err: unknown) {
      setSaveMsg({ ok: false, text: 'Preview failed: ' + (err instanceof Error ? err.message : String(err)) })
    } finally {
      setPreviewLoading(false)
    }
  }

  async function generatePDF() {
    setLoading(true)
    try {
      if (form.clientName.trim()) await ensureClientExists(form.clientName.trim(), form.clientAddress.trim() || undefined)

      const res = await fetch('/api/generate-pdf', { method: 'POST', body: buildReportFormData() })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `inspection-report-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      alert('Error generating PDF: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }

  // TODO: Temporary — Send Report will email the report to the customer instead of generating a PDF download.
  async function handleSendReport() {
    await generatePDF()
  }

  // ── RENDER ───────────────────────────────────────────────────────────────

  return (
    <>
      <main className="container">
        {mode === 'preview' ? (
          <div className="page-header">
            <h1>Report Preview</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btn-sm" onClick={() => setMode(previewFrom)}>← Edit</button>
              {/* TODO: Temporary — Send Report will email the report to the customer instead of generating a PDF download. */}
              <button className="btn btn-sm" onClick={handleSendReport} disabled={loading}>
                {loading ? 'Sending…' : 'Send Report'}
              </button>
              <button className="btn btn-primary" onClick={generatePDF} disabled={loading}>
                {loading ? 'Generating…' : 'Create PDF'}
              </button>
            </div>
          </div>
        ) : mode === 'readonly' ? (
          <div className="page-header">
            <h1>Inspection Details</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btn-sm" onClick={() => setMode('edit')}>Edit</button>
              <button className="btn btn-sm" onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? 'Loading…' : 'Preview Report'}
              </button>
            </div>
          </div>
        ) : (
          <div className="page-header">
            <h1>Inspection Details</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {saveMsg && (
                <span style={{ fontSize: 13, color: saveMsg.ok ? '#22c55e' : '#ef4444' }}>{saveMsg.text}</span>
              )}
              <button className="btn btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              {savedOk && (
                <button className="btn btn-sm" onClick={handlePreview} disabled={previewLoading}>
                  {previewLoading ? 'Loading…' : 'Preview Report'}
                </button>
              )}
            </div>
          </div>
        )}

        {mode === 'preview' && previewHtml && (
          <iframe
            srcDoc={previewHtml}
            title="Report Preview"
            style={{ width: '100%', height: '80vh', border: 'none', borderRadius: 8, background: '#fff', display: 'block' }}
          />
        )}

        {(mode === 'edit' || mode === 'readonly') && (<>

        {/* COMPANY INFO — read-only, edit via /company */}
        <section className="card">
          <div className="section-header">
            <h2>Company Information</h2>
            <a href="/company" className="btn btn-sm">Edit</a>
          </div>
          <div className="grid-2">
            {([
              ['companyName',         'Company Name'],
              ['companyAddress',      'Company Address'],
              ['companyCityStateZip', 'City / State / Zip'],
              ['companyPhone',        'Company Phone'],
            ] as [keyof CompanySettings, string][]).map(([key, label]) => (
              <div className="field" key={key}>
                <label>{label}</label>
                <p style={{
                  padding: '7px 10px', border: '1px solid #3a3a3c', borderRadius: 6,
                  fontSize: 13, color: '#ffffff', background: '#2c2c2e', margin: 0,
                }}>
                  {(company[key] as string) || <span style={{ color: '#71717a' }}>—</span>}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* INSPECTOR */}
        <section className="card">
          <h2>Inspected By</h2>
          <div className="grid-2">
            <div className="field">
              <label>Inspector</label>
              <select
                value={form.inspectorId}
                onChange={e => setField('inspectorId', e.target.value)}
                disabled={mode === 'readonly'}
              >
                <option value="">— Select Inspector —</option>
                {inspectors.map(i => (
                  <option key={i.id} value={String(i.id)}>
                    {i.firstName} {i.lastName}
                  </option>
                ))}
              </select>
            </div>
            {selectedInspector && (
              <div className="field">
                <label>License #</label>
                <p style={{
                  padding: '7px 10px', border: '1px solid #3a3a3c', borderRadius: 6,
                  fontSize: 13, color: '#ffffff', background: '#2c2c2e', margin: 0,
                }}>
                  {selectedInspector.licenseNum || <span style={{ color: '#71717a' }}>—</span>}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* CLIENT & SITE */}
        <section className="card">
          <h2>Client &amp; Site</h2>
          <div className="grid-2">
            <div className="field">
              <label>Client Name</label>
              <Autocomplete
                name="clientName"
                value={form.clientName}
                onChange={v => setField('clientName', v)}
                onSelect={opt => {
                  setField('clientName', opt.label)
                  if (opt.address) setField('clientAddress', opt.address)
                }}
                options={clientOptions}
                placeholder="Type or select a client"
                disabled={mode === 'readonly'}
              />
            </div>
            <div className="field">
              <label>Client Address</label>
              <input type="text" value={form.clientAddress} onChange={e => setField('clientAddress', e.target.value)} disabled={mode === 'readonly'} />
            </div>
            <div className="field">
              <label>
                Site Name <span style={{ color: '#ffffff' }}>*</span>
                {fieldErrors.siteName && <span style={{ color: '#ef4444', marginLeft: 6, fontSize: 12 }}>{fieldErrors.siteName}</span>}
              </label>
              <Autocomplete
                name="siteName"
                value={form.siteName}
                onChange={v => setField('siteName', v)}
                onSelect={opt => {
                  setField('siteName', opt.label)
                  if (opt.address) setField('siteAddress', opt.address)
                  if (opt.clientName) {
                    setField('clientName', opt.clientName)
                    if (opt.clientAddress) setField('clientAddress', opt.clientAddress)
                  }
                }}
                options={siteOptions}
                placeholder="Type or select a site"
                disabled={mode === 'readonly'}
              />
            </div>
            <div className="field">
              <label>Site Address</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="text" value={form.siteAddress} onChange={e => setField('siteAddress', e.target.value)} style={{ flex: 1 }} disabled={mode === 'readonly'} />
                {mode !== 'readonly' && (
                <button type="button" className="btn btn-sm" onClick={handleGetLocation} disabled={geoLoading} title="Use current location" style={{ flexShrink: 0 }}>
                  {geoLoading ? '…' : '📍'}
                </button>
                )}
              </div>
              {geoResults.length > 0 && (
                <div style={{ marginTop: 4, border: '1px solid #3a3a3c', borderRadius: 6, background: '#1c1c1e', overflow: 'hidden' }}>
                  {geoResults.map((addr, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectGeoResult(addr)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', color: '#ffffff', background: 'transparent', border: 'none', borderTop: i > 0 ? '1px solid #3a3a3c' : 'none', cursor: 'pointer', fontSize: 13 }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#2c2c2e' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {addr}
                    </button>
                  ))}
                </div>
              )}
              {geoError && (
                <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: 'block' }}>{geoError}</span>
              )}
            </div>
          </div>
        </section>

        {/* INSPECTION INFO */}
        <section className="card">
          <h2>Inspection Information</h2>
          <div className="grid-2">
            <div className="field">
              <label>
                Date Performed <span style={{ color: '#ffffff' }}>*</span>
                {fieldErrors.datePerformed && <span style={{ color: '#ef4444', marginLeft: 6, fontSize: 12 }}>{fieldErrors.datePerformed}</span>}
              </label>
              <input type="date" value={form.datePerformed} onChange={e => setField('datePerformed', e.target.value)} disabled={mode === 'readonly'} />
            </div>
            <div className="field">
              <label>Inspection Type</label>
              <select value={form.inspectionType} onChange={e => setField('inspectionType', e.target.value)} disabled={mode === 'readonly'}>
                {['Repair Inspection','Start-up','Mid-season','Diagnosis','Monthly','Quarterly','Late-season','Winterization'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Account Type</label>
              <select value={form.accountType} onChange={e => setField('accountType', e.target.value)} disabled={mode === 'readonly'}>
                {['Commercial','Residential','HOA','Municipal'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Account Number</label>
              <input type="text" value={form.accountNumber} onChange={e => setField('accountNumber', e.target.value)} disabled={mode === 'readonly'} />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={e => setField('status', e.target.value)} disabled={mode === 'readonly'}>
                {['New','In Progress','Completed'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setField('dueDate', e.target.value)} disabled={mode === 'readonly'} />
            </div>
            <div className="field">
              <label>Total System Repair Estimate ($)</label>
              <input type="number" value={form.repairEstimate} onChange={e => setField('repairEstimate', e.target.value)} step="0.01" placeholder="0.00" disabled={mode === 'readonly'} />
            </div>
          </div>
          <div className="field full-width" style={{ marginTop: 12 }}>
            <label>Inspection Notes <span className="hint">(displayed on PDF)</span></label>
            <textarea rows={3} value={form.inspectionNotes} onChange={e => setField('inspectionNotes', e.target.value)} disabled={mode === 'readonly'} />
          </div>
          <div className="field full-width" style={{ marginTop: 12 }}>
            <label>Internal Notes <span className="hint">(NOT displayed on PDF)</span></label>
            <textarea rows={2} value={form.internalNotes} onChange={e => setField('internalNotes', e.target.value)} disabled={mode === 'readonly'} />
          </div>
        </section>

        {/* SYSTEM OVERVIEW */}
        <section className="card">
          <h2>Irrigation System Overview</h2>
          <div className="grid-4">
            <div className="field">
              <label>Static Pressure (PSI)</label>
              <input type="number" step="0.1" value={form.staticPressure} onChange={e => setField('staticPressure', e.target.value)} placeholder="PSI" disabled={mode === 'readonly'} />
            </div>
            {([
              ['backflowInstalled','Backflow Installed?'],
              ['backflowServiceable','Backflow Serviceable?'],
              ['isolationValve','Isolation Valve Installed?'],
            ] as [string,string][]).map(([key, label]) => (
              <div className="field checkbox-field" key={key}>
                <label>
                  <input type="checkbox" checked={(form as unknown as Record<string,boolean>)[key]} onChange={e => setField(key, e.target.checked)} disabled={mode === 'readonly'} />
                  {label}
                </label>
              </div>
            ))}
          </div>
          <div className="field full-width" style={{ marginTop: 12 }}>
            <label>Supply / System Notes</label>
            <textarea rows={2} value={form.systemNotes} onChange={e => setField('systemNotes', e.target.value)} disabled={mode === 'readonly'} />
          </div>
        </section>

        {/* BACKFLOWS */}
        <section className="card">
          <div className="section-header">
            <h2>Backflow Devices</h2>
            {mode !== 'readonly' && (
              <button type="button" className="btn btn-sm" onClick={addBackflow}>+ Backflow</button>
            )}
          </div>
          {backflows.map((bf, i) => (
            <div className="backflow-row" key={bf.id}>
              <span style={{ fontWeight: 700, fontSize: 12 }}>#{i+1}</span>
              {(['manufacturer','type','model'] as const).map(f => (
                <div className="field" key={f}>
                  <label>{f.charAt(0).toUpperCase()+f.slice(1)}</label>
                  <input type="text" value={bf[f]} onChange={e => updateBackflow(bf.id, f, e.target.value)} placeholder={f.charAt(0).toUpperCase()+f.slice(1)} disabled={mode === 'readonly'} />
                </div>
              ))}
              <div className="field">
                <label>Size (inches)</label>
                <input type="number" step="0.25" value={bf.size} onChange={e => updateBackflow(bf.id, 'size', e.target.value)} placeholder="e.g. 1" disabled={mode === 'readonly'} />
              </div>
              {mode !== 'readonly' && (
                <button type="button" className="btn btn-danger" onClick={() => removeBackflow(bf.id)}>✕</button>
              )}
            </div>
          ))}
        </section>

        {/* CONTROLLERS */}
        <section className="card">
          <div className="section-header">
            <h2>Controllers</h2>
            {mode !== 'readonly' && (
              <button type="button" className="btn btn-sm" onClick={addController}>+ Controller</button>
            )}
          </div>
          <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Location</th><th>Manufacturer</th><th>Model</th>
                <th>Sensors</th><th># Zones</th><th>Master Valve?</th>
                {mode !== 'readonly' && <th></th>}
              </tr>
            </thead>
            <tbody>
              {controllers.map((ct, i) => (
                <React.Fragment key={ct.id}>
                  <tr>
                    <td style={{verticalAlign:'top',paddingTop:12}}>{i+1}</td>
                    <td style={{verticalAlign:'top',paddingTop:8}}><input value={ct.location} onChange={e => updateController(ct.id, 'location', e.target.value)} placeholder="e.g. Front of building" disabled={mode === 'readonly'} /></td>
                    <td style={{verticalAlign:'top',paddingTop:8}}><input value={ct.manufacturer} onChange={e => updateController(ct.id, 'manufacturer', e.target.value)} placeholder="Hunter" disabled={mode === 'readonly'} /></td>
                    <td style={{verticalAlign:'top',paddingTop:8}}><input value={ct.model} onChange={e => updateController(ct.id, 'model', e.target.value)} placeholder="Pro-HC" disabled={mode === 'readonly'} /></td>
                    <td style={{verticalAlign:'top',paddingTop:8}}><input value={ct.sensors} onChange={e => updateController(ct.id, 'sensors', e.target.value)} placeholder="Rain/Freeze" disabled={mode === 'readonly'} /></td>
                    <td style={{verticalAlign:'top',paddingTop:8}}><input type="number" style={{width:60}} value={ct.numZones} onChange={e => updateController(ct.id, 'numZones', e.target.value)} disabled={mode === 'readonly'} /></td>
                    <td style={{verticalAlign:'top',paddingTop:10}}><input type="checkbox" checked={ct.masterValve} onChange={e => { updateController(ct.id, 'masterValve', e.target.checked); if (!e.target.checked) updateController(ct.id, 'masterValveNotes', '') }} disabled={mode === 'readonly'} /></td>
                    {mode !== 'readonly' && (
                      <td rowSpan={2} style={{verticalAlign:'top',paddingTop:8}}>
                        <button type="button" className="btn btn-danger" onClick={() => removeController(ct.id)}>✕</button>
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td colSpan={7} style={{paddingTop:4,paddingBottom:12,borderBottom:'2px solid #e4e4e7'}}>
                      <div style={{display:'flex',gap:16}}>
                        {ct.masterValve && (
                          <div style={{flex:1}}>
                            <div style={{fontSize:11,color:'#71717a',marginBottom:3}}>MV Repair Notes</div>
                            <textarea rows={2} value={ct.masterValveNotes} onChange={e => updateController(ct.id, 'masterValveNotes', e.target.value)} placeholder="Repair notes..." style={{width:'100%'}} disabled={mode === 'readonly'} />
                          </div>
                        )}
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,color:'#71717a',marginBottom:3}}>Internal Notes</div>
                          <textarea rows={2} value={ct.notes} onChange={e => updateController(ct.id, 'notes', e.target.value)} placeholder="Notes" style={{width:'100%'}} disabled={mode === 'readonly'} />
                        </div>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </section>

        {/* ZONE DESCRIPTIONS */}
        <section className="card">
          <div className="section-header">
            <h2>Zone Descriptions</h2>
            {mode !== 'readonly' && (
              <button type="button" className="btn btn-sm" onClick={addZone}>+ Zone</button>
            )}
          </div>
          <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Zone #</th><th>Controller</th><th>Description</th>
                <th>Landscape Type(s)</th><th>Irrigation Type(s)</th>
                {mode !== 'readonly' && <th></th>}
              </tr>
            </thead>
            <tbody>
              {zones.map(zn => (
                <React.Fragment key={zn.id}>
                  <tr>
                    <td style={{verticalAlign:'top',paddingTop:8}}><input type="number" style={{width:55}} value={zn.zoneNum} onChange={e => updateZone(zn.id, 'zoneNum', e.target.value)} disabled={mode === 'readonly'} /></td>
                    <td style={{verticalAlign:'top',paddingTop:8}}>
                      <select value={zn.controller} onChange={e => updateZone(zn.id, 'controller', e.target.value)} style={{minWidth:120}} disabled={mode === 'readonly'}>
                        <option value="">—</option>
                        {controllers.map((ct, i) => (
                          <option key={ct.id} value={String(ct.id)}>#{i+1} - {ct.manufacturer} {ct.model}{ct.location ? ' - '+ct.location : ''}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{verticalAlign:'top',paddingTop:8}}><input value={zn.description} onChange={e => updateZone(zn.id, 'description', e.target.value)} placeholder="Description" disabled={mode === 'readonly'} /></td>
                    <td style={{verticalAlign:'top'}}>
                      <div style={{display:'flex',flexDirection:'column',gap:2}}>
                        {LANDSCAPE_TYPES.map(lt => (
                          <label key={lt} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,cursor: mode === 'readonly' ? 'default' : 'pointer'}}>
                            <input type="checkbox" checked={zn.landscapeTypes.includes(lt)} onChange={() => toggleMultiSelect(zn.id,'landscapeTypes',lt)} disabled={mode === 'readonly'} />
                            {lt}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td style={{verticalAlign:'top'}}>
                      <div style={{display:'flex',flexDirection:'column',gap:2}}>
                        {IRRIGATION_TYPES.map(it => (
                          <label key={it} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,cursor: mode === 'readonly' ? 'default' : 'pointer'}}>
                            <input type="checkbox" checked={zn.irrigationTypes.includes(it)} onChange={() => toggleMultiSelect(zn.id,'irrigationTypes',it)} disabled={mode === 'readonly'} />
                            {it}
                          </label>
                        ))}
                      </div>
                    </td>
                    {mode !== 'readonly' && (
                      <td rowSpan={2} style={{verticalAlign:'top',paddingTop:8}}>
                        <button type="button" className="btn btn-danger" onClick={() => removeZone(zn.id)}>✕</button>
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td colSpan={5} style={{paddingTop:4,paddingBottom:12,borderBottom:'2px solid #e4e4e7'}}>
                      <div style={{display:'flex',flexDirection:'column',gap:12}}>
                        {/* NOTES BOX */}
                        <div>
                          <div style={{fontSize:11,color:'#71717a',marginBottom:3}}>Notes</div>
                          <textarea rows={2} value={zn.notes} onChange={e => updateZone(zn.id, 'notes', e.target.value)} placeholder="Notes..." style={{width:'100%'}} disabled={mode === 'readonly'} />
                        </div>

                        {/* PHOTOS SECTION */}
                        <div>
                          <div style={{fontSize:11,color:'#71717a',marginBottom:3}}>Photos ({zn.photoData.length}/30)</div>

                          {mode !== 'readonly' && (
                            <>
                              <input type="file" accept="image/*" multiple style={{display:'none'}}
                                ref={el => { photoRefs.current[`zone_upload_${zn.id}`] = el }}
                                onChange={async e => {
                                  const files = Array.from(e.target.files ?? [])
                                  for (const file of files) {
                                    if (zn.photoData.length >= 30) {
                                      setPhotoErrors(p => ({...p, [zn.id]: 'Maximum 30 photos per zone reached'}))
                                      return
                                    }
                                    setPhotoUploading(p => ({...p, [zn.id]: true}))
                                    setPhotoErrors(p => ({...p, [zn.id]: ''}))

                                    try {
                                      const reader = new FileReader()
                                      reader.onload = () => {
                                        setPhotoThumbs(t => ({...t, [zn.id]: [...(t[zn.id] ?? []), reader.result as string]}))
                                      }
                                      reader.readAsDataURL(file)

                                      const fd = new FormData()
                                      fd.append('file', file)
                                      fd.append('zoneNum', zn.zoneNum)
                                      const res = await uploadZonePhoto(fd)
                                      if (res.ok) {
                                        addZonePhotoUrl(zn.id, res.data.publicUrl || res.data.key)
                                      } else {
                                        setPhotoErrors(p => ({...p, [zn.id]: res.error || 'Upload failed'}))
                                      }
                                    } catch (err: any) {
                                      setPhotoErrors(p => ({...p, [zn.id]: err.message || 'Upload error'}))
                                    } finally {
                                      setPhotoUploading(p => ({...p, [zn.id]: false}))
                                    }
                                  }
                                  e.target.value = ''
                                }}
                              />
                              <input type="file" accept="image/*" capture="environment" style={{display:'none'}}
                                ref={el => { photoRefs.current[`zone_capture_${zn.id}`] = el }}
                                onChange={async e => {
                                  const file = e.target.files?.[0]
                                  if (!file) return

                                  if (zn.photoData.length >= 30) {
                                    setPhotoErrors(p => ({...p, [zn.id]: 'Maximum 30 photos per zone reached'}))
                                    return
                                  }

                                  setPhotoUploading(p => ({...p, [zn.id]: true}))
                                  setPhotoErrors(p => ({...p, [zn.id]: ''}))

                                  try {
                                    const reader = new FileReader()
                                    reader.onload = () => {
                                      setPhotoThumbs(t => ({...t, [zn.id]: [...(t[zn.id] ?? []), reader.result as string]}))
                                    }
                                    reader.readAsDataURL(file)

                                    const fd = new FormData()
                                    fd.append('file', file)
                                    fd.append('zoneNum', zn.zoneNum)
                                    const res = await uploadZonePhoto(fd)
                                    if (res.ok) {
                                      addZonePhotoUrl(zn.id, res.data.publicUrl || res.data.key)
                                    } else {
                                      setPhotoErrors(p => ({...p, [zn.id]: res.error || 'Upload failed'}))
                                    }
                                  } catch (err: any) {
                                    setPhotoErrors(p => ({...p, [zn.id]: err.message || 'Upload error'}))
                                  } finally {
                                    setPhotoUploading(p => ({...p, [zn.id]: false}))
                                  }
                                  e.target.value = ''
                                }}
                              />
                              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
                                <button type="button" className="btn btn-sm" onClick={() => photoRefs.current[`zone_upload_${zn.id}`]?.click()} disabled={photoUploading[zn.id] || zn.photoData.length >= 30}>Upload</button>
                                <button type="button" className="btn btn-sm" onClick={() => photoRefs.current[`zone_capture_${zn.id}`]?.click()} disabled={photoUploading[zn.id] || zn.photoData.length >= 30}>📷 Capture</button>
                                {photoUploading[zn.id] && <span style={{fontSize:12,color:'#3b82f6'}}>⏳ Uploading...</span>}
                              </div>
                            </>
                          )}

                          {photoErrors[zn.id] && (
                            <div style={{fontSize:11,color:'#ef4444',marginBottom:8,padding:8,backgroundColor:'#fee2e2',borderRadius:4}}>
                              ❌ {photoErrors[zn.id]}
                            </div>
                          )}

                          {/* RESPONSIVE PHOTO GRID WITH ANNOTATIONS */}
                          {zn.photoData.length > 0 && (
                            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))',gap:8}}>
                              {zn.photoData.map((photo, idx) => (
                                <div key={idx} style={{display:'flex',flexDirection:'column',gap:4}}>
                                  <img src={photo.url} alt={`Photo ${idx + 1}`} style={{width:'100%',height:120,objectFit:'cover',borderRadius:4,border:'1px solid #e5e7eb',backgroundColor:'#f5f5f5'}} />
                                  {mode !== 'readonly' && (
                                    <input
                                      type="text"
                                      placeholder="Annotation..."
                                      value={photo.annotation}
                                      onChange={e => updateZonePhotoAnnotation(zn.id, idx, e.target.value)}
                                      maxLength={100}
                                      style={{fontSize:11,padding:4,borderRadius:3,border:'1px solid #d4d4d8',width:'100%',boxSizing:'border-box'}}
                                    />
                                  )}
                                  {mode === 'readonly' && photo.annotation && (
                                    <div style={{fontSize:11,color:'#71717a',padding:4}}>{photo.annotation}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </section>

        {/* ZONE ISSUES */}
        <section className="card">
          <div className="section-header">
            <h2>Zone Issues</h2>
            <span className="hint">Check all issues found per zone</span>
          </div>
          <div className="zone-issues-wrapper">
            <table className="issues-table">
              <thead>
                <tr>
                  <th className="zone-col">Zone #</th>
                  {ISSUE_TYPES.map(issue => (
                    <th key={issue} className="issue-col">{issue}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {zones.map(zn => (
                  <tr key={zn.id}>
                    <td style={{fontWeight:600}}>Zone {zn.zoneNum}</td>
                    {ISSUE_TYPES.map(issue => (
                      <td key={issue}>
                        <input
                          type="checkbox"
                          checked={(zoneIssues[zn.zoneNum] || []).includes(issue)}
                          onChange={() => toggleIssue(zn.zoneNum, issue)}
                          disabled={mode === 'readonly'}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* QUOTE ITEMS */}
        <section className="card">
          <div className="section-header">
            <h2>Quote / Repair Items</h2>
            {mode !== 'readonly' && (
              <button type="button" className="btn btn-sm" onClick={addQuoteItem}>+ Item</button>
            )}
          </div>
          <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Location (e.g. C1-Z3)</th><th>Item / Description</th>
                <th>Price ($)</th><th>QTY</th><th>Total</th>
                {mode !== 'readonly' && <th></th>}
              </tr>
            </thead>
            <tbody>
              {quoteItems.map((qi, i) => (
                <tr key={qi.id}>
                  <td>{i+1}</td>
                  <td><input style={{width:70}} value={qi.location} onChange={e => updateQuoteItem(qi.id,'location',e.target.value)} placeholder="C1-Z3" disabled={mode === 'readonly'} /></td>
                  <td>
                    <input value={qi.item} onChange={e => updateQuoteItem(qi.id,'item',e.target.value)} placeholder="Item name" disabled={mode === 'readonly'} />
                    <input value={qi.description} onChange={e => updateQuoteItem(qi.id,'description',e.target.value)} placeholder="Description" style={{marginTop:2,fontSize:11,color:'#71717a'}} disabled={mode === 'readonly'} />
                  </td>
                  <td><input type="number" style={{width:80}} step="0.01" value={qi.price} onChange={e => updateQuoteItem(qi.id,'price',e.target.value)} placeholder="0.00" disabled={mode === 'readonly'} /></td>
                  <td><input type="number" style={{width:55}} value={qi.qty} onChange={e => updateQuoteItem(qi.id,'qty',e.target.value)} min="1" disabled={mode === 'readonly'} /></td>
                  <td>${((parseFloat(qi.price)||0)*(parseInt(qi.qty)||1)).toFixed(2)}</td>
                  {mode !== 'readonly' && (
                    <td><button type="button" className="btn btn-danger" onClick={() => removeQuoteItem(qi.id)}>✕</button></td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} style={{textAlign:'right',fontWeight:600,padding:'8px 12px'}}>Total:</td>
                <td style={{fontWeight:600,padding:'8px 12px'}}>${quoteTotal.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          </div>
        </section>

        {mode === 'edit' && (
          <div className="bottom-actions" style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
            {saveMsg && (
              <span style={{ fontSize: 13, color: saveMsg.ok ? '#22c55e' : '#ef4444' }}>{saveMsg.text}</span>
            )}
            <button className="btn btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            {savedOk && (
              <button className="btn btn-sm" onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? 'Loading…' : 'Preview Report'}
              </button>
            )}
          </div>
        )}

        </>)}
      </main>

      {loading && (
        <div className="loading-overlay active">
          <div className="spinner" />
          <span>Generating PDF…</span>
        </div>
      )}
    </>
  )
}
