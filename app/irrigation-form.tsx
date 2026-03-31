'use client'

import { useState, useRef } from 'react'
import { Autocomplete } from '@/components/ui/autocomplete'
import { ensureClientExists } from '@/actions/clients'
import type { Client, CompanySettings } from '@/types'
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

type Controller = { id: number; location: string; manufacturer: string; model: string; sensors: string; numZones: string; masterValve: boolean; notes: string }
type Zone = { id: number; zoneNum: string; controller: string; description: string; landscapeTypes: string[]; irrigationTypes: string[] }
type Backflow = { id: number; manufacturer: string; type: string; model: string; size: string }
type ZoneNote = { id: number; zoneNum: string; zoneDesc: string; note: string }
type QuoteItem = { id: number; location: string; item: string; description: string; price: string; qty: string }

let nextId = 1
const uid = () => nextId++

interface IrrigationFormProps {
  clients:  Client[]
  sites:    SiteWithClient[]
  company:  CompanySettings
}

export function IrrigationForm({ clients, sites, company }: IrrigationFormProps) {
  const [form, setForm] = useState({
    clientName: '', clientAddress: '', siteName: '', siteAddress: '',
    datePerformed: '', checkupType: 'Repair Checkup', accountType: 'Commercial',
    accountNumber: '', status: 'New', dueDate: '', assignedUser: '',
    repairEstimate: '', checkupNotes: '', internalNotes: '',
    staticPressure: '', backflowInstalled: false, backflowServiceable: false,
    isolationValve: false, systemNotes: '',
  })

  const [controllers, setControllers] = useState<Controller[]>([
    { id: uid(), location: '', manufacturer: '', model: '', sensors: '', numZones: '0', masterValve: false, notes: '' }
  ])
  const [zones, setZones] = useState<Zone[]>([
    { id: uid(), zoneNum: '1', controller: '', description: '', landscapeTypes: [], irrigationTypes: [] },
    { id: uid(), zoneNum: '2', controller: '', description: '', landscapeTypes: [], irrigationTypes: [] },
  ])
  const [backflows, setBackflows] = useState<Backflow[]>([])
  const [zoneIssues, setZoneIssues] = useState<Record<string, string[]>>({})
  const [zoneNotes, setZoneNotes] = useState<ZoneNote[]>([])
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([
    { id: uid(), location: '', item: '', description: '', price: '', qty: '1' }
  ])
  const [loading, setLoading] = useState(false)
  const photoRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // ── AUTOCOMPLETE DATA ──────────────────────────────────────────────────────

  const clientOptions = clients.map(c => ({ label: c.name, address: c.address ?? undefined }))
  const siteOptions   = sites.map(s => ({
    label:         s.name,
    address:       s.address       ?? undefined,
    clientName:    s.clientName    ?? undefined,
    clientAddress: s.clientAddress ?? undefined,
  }))

  // ── FIELD HANDLERS ──────────────────────────────────────────────────────

  function setField(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  // ── CONTROLLERS ──────────────────────────────────────────────────────────

  function addController() {
    setControllers(c => [...c, { id: uid(), location: '', manufacturer: '', model: '', sensors: '', numZones: '0', masterValve: false, notes: '' }])
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
    setZones(z => [...z, { id: uid(), zoneNum: num, controller: '', description: '', landscapeTypes: [], irrigationTypes: [] }])
  }
  function updateZone(id: number, key: keyof Zone, value: string | string[]) {
    setZones(z => z.map(zn => zn.id === id ? { ...zn, [key]: value } : zn))
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

  // ── ZONE NOTES ───────────────────────────────────────────────────────────

  function addZoneNote() {
    setZoneNotes(n => [...n, { id: uid(), zoneNum: '', zoneDesc: '', note: '' }])
  }
  function updateZoneNote(id: number, key: keyof ZoneNote, value: string) {
    setZoneNotes(n => n.map(note => note.id === id ? { ...note, [key]: value } : note))
  }
  function removeZoneNote(id: number) {
    setZoneNotes(n => n.filter(note => note.id !== id))
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

  // ── PDF GENERATION ───────────────────────────────────────────────────────

  async function generatePDF() {
    setLoading(true)
    try {
      // Persist client to DB (creates if name not yet in DB, returns existing otherwise)
      if (form.clientName.trim()) {
        await ensureClientExists(
          form.clientName.trim(),
          form.clientAddress.trim() || undefined,
        )
      }

      const fd = new FormData()

      // Company fields (read-only on this form, sourced from DB)
      Object.entries(company).forEach(([k, v]) => {
        if (v !== null) fd.append(k, String(v))
      })

      // Simple form fields
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)))

      // JSON data
      fd.append('controllers', JSON.stringify(controllers))
      fd.append('zones', JSON.stringify(zones))
      fd.append('backflows', JSON.stringify(backflows))
      fd.append('zoneIssues', JSON.stringify(
        zones.map(z => ({ zoneNum: z.zoneNum, issues: zoneIssues[z.zoneNum] || [] }))
      ))
      fd.append('zoneNotes', JSON.stringify(zoneNotes))
      fd.append('quoteItems', JSON.stringify(
        quoteItems.map((qi, i) => ({
          num: i + 1,
          location: qi.location,
          item: qi.item,
          description: qi.description,
          price: parseFloat(qi.price) || 0,
          qty: parseInt(qi.qty) || 1,
        }))
      ))

      // Zone photos
      zones.forEach(z => {
        const input = photoRefs.current[`zone_${z.id}`]
        if (input?.files) {
          Array.from(input.files).forEach(file => {
            fd.append(`photo_zone_${z.zoneNum}`, file)
          })
        }
      })

      const res = await fetch('/api/generate-pdf', { method: 'POST', body: fd })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `checkup-report-${Date.now()}.pdf`
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

  // ── RENDER ───────────────────────────────────────────────────────────────

  return (
    <>
      <main className="container">
        <div className="page-header">
          <h1>Checkup Details</h1>
          <button className="btn btn-primary" onClick={generatePDF}>Create PDF</button>
        </div>

        {/* COMPANY INFO — read-only, edit via /company */}
        <section className="card">
          <div className="section-header">
            <h2>Company Information</h2>
            <a href="/company" className="btn btn-sm">Edit</a>
          </div>
          <div className="grid-2">
            {([
              ['companyName',         'Company Name'],
              ['licenseNum',          'License #'],
              ['companyAddress',      'Company Address'],
              ['companyCityStateZip', 'City / State / Zip'],
              ['companyPhone',        'Company Phone'],
              ['performedBy',         'Performed By'],
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
              />
            </div>
            <div className="field">
              <label>Client Address</label>
              <input type="text" value={form.clientAddress} onChange={e => setField('clientAddress', e.target.value)} />
            </div>
            <div className="field">
              <label>Site Name</label>
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
              />
            </div>
            <div className="field">
              <label>Site Address</label>
              <input type="text" value={form.siteAddress} onChange={e => setField('siteAddress', e.target.value)} />
            </div>
          </div>
        </section>

        {/* CHECKUP INFO */}
        <section className="card">
          <h2>Checkup Information</h2>
          <div className="grid-2">
            <div className="field">
              <label>Date Performed</label>
              <input type="date" value={form.datePerformed} onChange={e => setField('datePerformed', e.target.value)} />
            </div>
            <div className="field">
              <label>Checkup Type</label>
              <select value={form.checkupType} onChange={e => setField('checkupType', e.target.value)}>
                {['Repair Checkup','Start-up','Mid-season','Diagnosis','Monthly','Quarterly','Late-season','Winterization'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Account Type</label>
              <select value={form.accountType} onChange={e => setField('accountType', e.target.value)}>
                {['Commercial','Residential','HOA','Municipal'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Account Number</label>
              <input type="text" value={form.accountNumber} onChange={e => setField('accountNumber', e.target.value)} />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={e => setField('status', e.target.value)}>
                {['New','In Progress','Completed'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setField('dueDate', e.target.value)} />
            </div>
            <div className="field">
              <label>Assigned User</label>
              <input type="text" value={form.assignedUser} onChange={e => setField('assignedUser', e.target.value)} />
            </div>
            <div className="field">
              <label>Total System Repair Estimate ($)</label>
              <input type="number" value={form.repairEstimate} onChange={e => setField('repairEstimate', e.target.value)} step="0.01" placeholder="0.00" />
            </div>
          </div>
          <div className="field full-width" style={{ marginTop: 12 }}>
            <label>Checkup Notes <span className="hint">(displayed on PDF)</span></label>
            <textarea rows={3} value={form.checkupNotes} onChange={e => setField('checkupNotes', e.target.value)} />
          </div>
          <div className="field full-width" style={{ marginTop: 12 }}>
            <label>Internal Notes <span className="hint">(NOT displayed on PDF)</span></label>
            <textarea rows={2} value={form.internalNotes} onChange={e => setField('internalNotes', e.target.value)} />
          </div>
        </section>

        {/* SYSTEM OVERVIEW */}
        <section className="card">
          <h2>Irrigation System Overview</h2>
          <div className="grid-4">
            <div className="field">
              <label>Static Pressure (PSI)</label>
              <input type="number" step="0.1" value={form.staticPressure} onChange={e => setField('staticPressure', e.target.value)} placeholder="PSI" />
            </div>
            {([
              ['backflowInstalled','Backflow Installed?'],
              ['backflowServiceable','Backflow Serviceable?'],
              ['isolationValve','Isolation Valve Installed?'],
            ] as [string,string][]).map(([key, label]) => (
              <div className="field checkbox-field" key={key}>
                <label>
                  <input type="checkbox" checked={(form as unknown as Record<string,boolean>)[key]} onChange={e => setField(key, e.target.checked)} />
                  {label}
                </label>
              </div>
            ))}
          </div>
          <div className="field full-width" style={{ marginTop: 12 }}>
            <label>Supply / System Notes</label>
            <textarea rows={2} value={form.systemNotes} onChange={e => setField('systemNotes', e.target.value)} />
          </div>
        </section>

        {/* BACKFLOWS */}
        <section className="card">
          <div className="section-header">
            <h2>Backflow Devices</h2>
            <button type="button" className="btn btn-sm" onClick={addBackflow}>+ Backflow</button>
          </div>
          {backflows.map((bf, i) => (
            <div className="backflow-row" key={bf.id}>
              <span style={{ fontWeight: 700, fontSize: 12 }}>#{i+1}</span>
              {(['manufacturer','type','model'] as const).map(f => (
                <div className="field" key={f}>
                  <label>{f.charAt(0).toUpperCase()+f.slice(1)}</label>
                  <input type="text" value={bf[f]} onChange={e => updateBackflow(bf.id, f, e.target.value)} placeholder={f.charAt(0).toUpperCase()+f.slice(1)} />
                </div>
              ))}
              <div className="field">
                <label>Size (inches)</label>
                <input type="number" step="0.25" value={bf.size} onChange={e => updateBackflow(bf.id, 'size', e.target.value)} placeholder="e.g. 1" />
              </div>
              <button type="button" className="btn btn-danger" onClick={() => removeBackflow(bf.id)}>✕</button>
            </div>
          ))}
        </section>

        {/* CONTROLLERS */}
        <section className="card">
          <div className="section-header">
            <h2>Controllers</h2>
            <button type="button" className="btn btn-sm" onClick={addController}>+ Controller</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Location</th><th>Manufacturer</th><th>Model</th>
                <th>Sensors</th><th># Zones</th><th>Master Valve?</th><th>Internal Notes</th><th></th>
              </tr>
            </thead>
            <tbody>
              {controllers.map((ct, i) => (
                <tr key={ct.id}>
                  <td>{i+1}</td>
                  <td><input value={ct.location} onChange={e => updateController(ct.id, 'location', e.target.value)} placeholder="e.g. Front of building" /></td>
                  <td><input value={ct.manufacturer} onChange={e => updateController(ct.id, 'manufacturer', e.target.value)} placeholder="Hunter" /></td>
                  <td><input value={ct.model} onChange={e => updateController(ct.id, 'model', e.target.value)} placeholder="Pro-HC" /></td>
                  <td><input value={ct.sensors} onChange={e => updateController(ct.id, 'sensors', e.target.value)} placeholder="Rain/Freeze" /></td>
                  <td><input type="number" style={{width:60}} value={ct.numZones} onChange={e => updateController(ct.id, 'numZones', e.target.value)} /></td>
                  <td><input type="checkbox" checked={ct.masterValve} onChange={e => updateController(ct.id, 'masterValve', e.target.checked)} /></td>
                  <td><input value={ct.notes} onChange={e => updateController(ct.id, 'notes', e.target.value)} placeholder="Notes" /></td>
                  <td><button type="button" className="btn btn-danger" onClick={() => removeController(ct.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ZONE DESCRIPTIONS */}
        <section className="card">
          <div className="section-header">
            <h2>Zone Descriptions</h2>
            <button type="button" className="btn btn-sm" onClick={addZone}>+ Zone</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Zone #</th><th>Controller</th><th>Description</th>
                <th>Landscape Type(s)</th><th>Irrigation Type(s)</th><th>Photos</th><th></th>
              </tr>
            </thead>
            <tbody>
              {zones.map(zn => (
                <tr key={zn.id}>
                  <td><input type="number" style={{width:55}} value={zn.zoneNum} onChange={e => updateZone(zn.id, 'zoneNum', e.target.value)} /></td>
                  <td>
                    <select value={zn.controller} onChange={e => updateZone(zn.id, 'controller', e.target.value)} style={{minWidth:120}}>
                      <option value="">—</option>
                      {controllers.map((ct, i) => (
                        <option key={ct.id} value={String(ct.id)}>#{i+1} - {ct.manufacturer} {ct.model}{ct.location ? ' - '+ct.location : ''}</option>
                      ))}
                    </select>
                  </td>
                  <td><input value={zn.description} onChange={e => updateZone(zn.id, 'description', e.target.value)} placeholder="Description" /></td>
                  <td>
                    <div style={{display:'flex',flexDirection:'column',gap:2}}>
                      {LANDSCAPE_TYPES.map(lt => (
                        <label key={lt} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,cursor:'pointer'}}>
                          <input type="checkbox" checked={zn.landscapeTypes.includes(lt)} onChange={() => toggleMultiSelect(zn.id,'landscapeTypes',lt)} />
                          {lt}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{display:'flex',flexDirection:'column',gap:2}}>
                      {IRRIGATION_TYPES.map(it => (
                        <label key={it} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,cursor:'pointer'}}>
                          <input type="checkbox" checked={zn.irrigationTypes.includes(it)} onChange={() => toggleMultiSelect(zn.id,'irrigationTypes',it)} />
                          {it}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{fontSize:11,maxWidth:140}}
                      ref={el => { photoRefs.current[`zone_${zn.id}`] = el }}
                    />
                  </td>
                  <td><button type="button" className="btn btn-danger" onClick={() => removeZone(zn.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
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
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ZONE NOTES */}
        <section className="card">
          <div className="section-header">
            <h2>Zone Notes</h2>
            <button type="button" className="btn btn-sm" onClick={addZoneNote}>+ Note</button>
          </div>
          {zoneNotes.map(n => (
            <div className="zone-note-row" key={n.id}>
              <div className="field">
                <label>Zone #</label>
                <input type="number" value={n.zoneNum} onChange={e => updateZoneNote(n.id,'zoneNum',e.target.value)} placeholder="Zone" />
              </div>
              <div className="field">
                <label>Zone Description</label>
                <input type="text" value={n.zoneDesc} onChange={e => updateZoneNote(n.id,'zoneDesc',e.target.value)} placeholder="Zone description" />
              </div>
              <div className="field">
                <label>Note</label>
                <textarea rows={2} value={n.note} onChange={e => updateZoneNote(n.id,'note',e.target.value)} placeholder="Describe the issue..." />
              </div>
              <button type="button" className="btn btn-danger" style={{alignSelf:'end'}} onClick={() => removeZoneNote(n.id)}>✕</button>
            </div>
          ))}
        </section>

        {/* QUOTE ITEMS */}
        <section className="card">
          <div className="section-header">
            <h2>Quote / Repair Items</h2>
            <button type="button" className="btn btn-sm" onClick={addQuoteItem}>+ Item</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Location (e.g. C1-Z3)</th><th>Item / Description</th>
                <th>Price ($)</th><th>QTY</th><th>Total</th><th></th>
              </tr>
            </thead>
            <tbody>
              {quoteItems.map((qi, i) => (
                <tr key={qi.id}>
                  <td>{i+1}</td>
                  <td><input style={{width:70}} value={qi.location} onChange={e => updateQuoteItem(qi.id,'location',e.target.value)} placeholder="C1-Z3" /></td>
                  <td>
                    <input value={qi.item} onChange={e => updateQuoteItem(qi.id,'item',e.target.value)} placeholder="Item name" />
                    <input value={qi.description} onChange={e => updateQuoteItem(qi.id,'description',e.target.value)} placeholder="Description" style={{marginTop:2,fontSize:11,color:'#71717a'}} />
                  </td>
                  <td><input type="number" style={{width:80}} step="0.01" value={qi.price} onChange={e => updateQuoteItem(qi.id,'price',e.target.value)} placeholder="0.00" /></td>
                  <td><input type="number" style={{width:55}} value={qi.qty} onChange={e => updateQuoteItem(qi.id,'qty',e.target.value)} min="1" /></td>
                  <td>${((parseFloat(qi.price)||0)*(parseInt(qi.qty)||1)).toFixed(2)}</td>
                  <td><button type="button" className="btn btn-danger" onClick={() => removeQuoteItem(qi.id)}>✕</button></td>
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
        </section>

        <div className="bottom-actions">
          <button className="btn btn-primary btn-lg" onClick={generatePDF}>Create PDF</button>
        </div>
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
