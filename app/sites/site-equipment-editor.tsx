'use client'

import React, { useState, useRef } from 'react'
import { updateSiteEquipment } from '@/actions/sites'
import type { SiteWithClient } from '@/actions/sites'
import type { ControllerFormData, ZoneFormData, BackflowFormData } from '@/types'

// Aliases to canonical form data types — never duplicate inline to avoid drift
type Controller = ControllerFormData
type Zone       = ZoneFormData
type Backflow   = BackflowFormData

const LANDSCAPE_TYPES = [
  'Full-sun turf', 'Shade turf', 'Low demand beds', 'High demand beds',
  'Trees', 'Shrubs', 'Ground cover', 'Slope',
]
const IRRIGATION_TYPES = [
  'Rotor', 'MPR spray', 'Fan spray', 'Rotator nozzle', 'Drip', 'Micro spray', 'Bubbler',
]

interface SiteEquipmentEditorProps {
  site: SiteWithClient
  onClose: () => void
  onSave?: () => void
}

export function SiteEquipmentEditor({ site, onClose, onSave }: SiteEquipmentEditorProps) {
  // ── ID counter — useRef so re-renders don't reset the counter ─────────────
  const nextIdRef = useRef(1)
  const uid = () => nextIdRef.current++

  const [controllers, setControllers] = useState<Controller[]>([])
  const [zones,       setZones]       = useState<Zone[]>([])
  const [backflows,   setBackflows]   = useState<Backflow[]>([])

  const [overview, setOverview] = useState({
    staticPressure:      '',
    backflowInstalled:   false,
    backflowServiceable: false,
    isolationValve:      false,
    systemNotes:         '',
  })

  const [saving,  setSaving]  = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // ── Controllers ────────────────────────────────────────────────────────────

  function addController() {
    setControllers(c => [
      ...c,
      { id: uid(), location: '', manufacturer: '', model: '', sensors: '', numZones: '0', masterValve: false, masterValveNotes: '', notes: '' },
    ])
  }
  function updateController(id: number, key: keyof Controller, value: string | boolean) {
    setControllers(c => c.map(ct => ct.id === id ? { ...ct, [key]: value } : ct))
  }
  function removeController(id: number) {
    setControllers(c => c.filter(ct => ct.id !== id))
  }

  // ── Zones ──────────────────────────────────────────────────────────────────

  function addZone() {
    const num = String(zones.length + 1)
    setZones(z => [
      ...z,
      { id: uid(), zoneNum: num, controller: '', description: '', landscapeTypes: [], irrigationTypes: [], notes: '', photoData: [] },
    ])
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

  // ── Backflows ──────────────────────────────────────────────────────────────

  function addBackflow() {
    setBackflows(b => [...b, { id: uid(), manufacturer: '', type: '', model: '', size: '' }])
  }
  function updateBackflow(id: number, key: keyof Backflow, value: string) {
    setBackflows(b => b.map(bf => bf.id === id ? { ...bf, [key]: value } : bf))
  }
  function removeBackflow(id: number) {
    setBackflows(b => b.filter(bf => bf.id !== id))
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const result = await updateSiteEquipment({
        siteId: site.id,
        controllers,
        zones,
        backflows,
        overview,
      })
      if (result.ok) {
        setSaveMsg({ ok: true, text: 'Equipment saved successfully.' })
        onSave?.()
      } else {
        setSaveMsg({ ok: false, text: result.error })
      }
    } catch {
      setSaveMsg({ ok: false, text: 'An unexpected error occurred.' })
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div data-testid="site-equipment-editor" style={{ padding: '0 0 32px 0' }}>

      {/* HEADER */}
      <div
        data-testid="site-equipment-editor-header"
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #3a3a3c',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
            {site.name}
          </h2>
          {site.address && (
            <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 2 }}>{site.address}</div>
          )}
          {site.clientName && (
            <div style={{ fontSize: 12, color: '#a1a1aa' }}>Client: {site.clientName}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saveMsg && (
            <span
              data-testid="site-equipment-editor-save-message"
              style={{ fontSize: 13, color: saveMsg.ok ? '#22c55e' : '#ef4444' }}
            >
              {saveMsg.text}
            </span>
          )}
          <button
            data-testid="site-equipment-editor-save"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            data-testid="site-equipment-editor-cancel"
            className="btn btn-sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* SYSTEM OVERVIEW */}
      <section className="card" data-testid="site-equipment-editor-overview">
        <div className="section-header">
          <h2>System Overview</h2>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <div className="field">
            <label htmlFor="overview-static-pressure">Static Pressure (PSI)</label>
            <input
              id="overview-static-pressure"
              data-testid="site-equipment-editor-overview-static-pressure"
              type="text"
              value={overview.staticPressure}
              onChange={e => setOverview(o => ({ ...o, staticPressure: e.target.value }))}
              placeholder="e.g. 65"
            />
          </div>
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                data-testid="site-equipment-editor-overview-backflow-installed"
                type="checkbox"
                checked={overview.backflowInstalled}
                onChange={e => setOverview(o => ({ ...o, backflowInstalled: e.target.checked }))}
              />
              Backflow Installed
            </label>
          </div>
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                data-testid="site-equipment-editor-overview-backflow-serviceable"
                type="checkbox"
                checked={overview.backflowServiceable}
                onChange={e => setOverview(o => ({ ...o, backflowServiceable: e.target.checked }))}
              />
              Backflow Serviceable
            </label>
          </div>
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                data-testid="site-equipment-editor-overview-isolation-valve"
                type="checkbox"
                checked={overview.isolationValve}
                onChange={e => setOverview(o => ({ ...o, isolationValve: e.target.checked }))}
              />
              Isolation Valve
            </label>
          </div>
        </div>
        <div className="field" style={{ marginTop: 8 }}>
          <label htmlFor="overview-system-notes">System Notes</label>
          <textarea
            id="overview-system-notes"
            data-testid="site-equipment-editor-overview-system-notes"
            rows={3}
            value={overview.systemNotes}
            onChange={e => setOverview(o => ({ ...o, systemNotes: e.target.value }))}
            placeholder="Notes about the irrigation system..."
            style={{ width: '100%' }}
          />
        </div>
      </section>

      {/* BACKFLOWS */}
      <section className="card">
        <div className="section-header">
          <h2>Backflow Devices</h2>
          <button
            data-testid="site-equipment-editor-add-backflow"
            type="button"
            className="btn btn-sm"
            onClick={addBackflow}
          >
            + Backflow
          </button>
        </div>
        {backflows.length === 0 && (
          <p style={{ color: '#a1a1aa', fontSize: 13 }}>No backflow devices. Add one above.</p>
        )}
        {backflows.map((bf, i) => (
          <div
            className="backflow-row"
            key={bf.id}
            data-testid="site-equipment-editor-backflow-row"
          >
            <span style={{ fontWeight: 700, fontSize: 12 }}>#{i + 1}</span>
            {(['manufacturer', 'type', 'model'] as const).map(f => (
              <div className="field" key={f}>
                <label>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                <input
                  type="text"
                  value={bf[f]}
                  onChange={e => updateBackflow(bf.id, f, e.target.value)}
                  placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                />
              </div>
            ))}
            <div className="field">
              <label>Size (inches)</label>
              <input
                type="number"
                step="0.25"
                value={bf.size}
                onChange={e => updateBackflow(bf.id, 'size', e.target.value)}
                placeholder="e.g. 1"
              />
            </div>
            <button
              type="button"
              className="btn btn-danger"
              data-testid="site-equipment-editor-remove-backflow"
              onClick={() => removeBackflow(bf.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </section>

      {/* CONTROLLERS */}
      <section className="card">
        <div className="section-header">
          <h2>Controllers</h2>
          <button
            data-testid="site-equipment-editor-add-controller"
            type="button"
            className="btn btn-sm"
            onClick={addController}
          >
            + Controller
          </button>
        </div>
        {controllers.length === 0 && (
          <p style={{ color: '#a1a1aa', fontSize: 13 }}>No controllers. Add one above.</p>
        )}
        <div className="table-scroll">
          <table className="data-table" data-testid="site-equipment-editor-controllers-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Location</th>
                <th>Manufacturer</th>
                <th>Model</th>
                <th>Sensors</th>
                <th># Zones</th>
                <th>Master Valve?</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {controllers.map((ct, i) => (
                <React.Fragment key={ct.id}>
                  <tr data-testid="site-equipment-editor-controller-row">
                    <td style={{ verticalAlign: 'top', paddingTop: 12 }}>{i + 1}</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>
                      <input
                        value={ct.location}
                        onChange={e => updateController(ct.id, 'location', e.target.value)}
                        placeholder="e.g. Front of building"
                      />
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>
                      <input
                        value={ct.manufacturer}
                        onChange={e => updateController(ct.id, 'manufacturer', e.target.value)}
                        placeholder="Hunter"
                      />
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>
                      <input
                        value={ct.model}
                        onChange={e => updateController(ct.id, 'model', e.target.value)}
                        placeholder="Pro-HC"
                      />
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>
                      <input
                        value={ct.sensors}
                        onChange={e => updateController(ct.id, 'sensors', e.target.value)}
                        placeholder="Rain/Freeze"
                      />
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>
                      <input
                        type="number"
                        style={{ width: 60 }}
                        value={ct.numZones}
                        onChange={e => updateController(ct.id, 'numZones', e.target.value)}
                      />
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: 10 }}>
                      <input
                        type="checkbox"
                        checked={ct.masterValve}
                        onChange={e => {
                          updateController(ct.id, 'masterValve', e.target.checked)
                          if (!e.target.checked) updateController(ct.id, 'masterValveNotes', '')
                        }}
                      />
                    </td>
                    <td rowSpan={2} style={{ verticalAlign: 'top', paddingTop: 8 }}>
                      <button
                        type="button"
                        className="btn btn-danger"
                        data-testid="site-equipment-editor-remove-controller"
                        onClick={() => removeController(ct.id)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={7} style={{ paddingTop: 4, paddingBottom: 12, borderBottom: '2px solid #e4e4e7' }}>
                      <div style={{ display: 'flex', gap: 16 }}>
                        {ct.masterValve && (
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: '#71717a', marginBottom: 3 }}>MV Repair Notes</div>
                            <textarea
                              rows={2}
                              value={ct.masterValveNotes}
                              onChange={e => updateController(ct.id, 'masterValveNotes', e.target.value)}
                              placeholder="Repair notes..."
                              style={{ width: '100%' }}
                            />
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: '#71717a', marginBottom: 3 }}>Internal Notes</div>
                          <textarea
                            rows={2}
                            value={ct.notes}
                            onChange={e => updateController(ct.id, 'notes', e.target.value)}
                            placeholder="Notes"
                            style={{ width: '100%' }}
                          />
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

      {/* ZONES */}
      <section className="card">
        <div className="section-header">
          <h2>Zone Descriptions</h2>
          <button
            data-testid="site-equipment-editor-add-zone"
            type="button"
            className="btn btn-sm"
            onClick={addZone}
          >
            + Zone
          </button>
        </div>
        {zones.length === 0 && (
          <p style={{ color: '#a1a1aa', fontSize: 13 }}>No zones. Add one above.</p>
        )}
        <div className="table-scroll">
          <table className="data-table" data-testid="site-equipment-editor-zones-table">
            <thead>
              <tr>
                <th>Zone #</th>
                <th>Controller</th>
                <th>Description</th>
                <th>Landscape Type(s)</th>
                <th>Irrigation Type(s)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {zones.map(zn => (
                <React.Fragment key={zn.id}>
                  <tr data-testid="site-equipment-editor-zone-row">
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>
                      <input
                        type="number"
                        style={{ width: 55 }}
                        value={zn.zoneNum}
                        onChange={e => updateZone(zn.id, 'zoneNum', e.target.value)}
                      />
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>
                      <select
                        value={zn.controller}
                        onChange={e => updateZone(zn.id, 'controller', e.target.value)}
                        style={{ minWidth: 120 }}
                      >
                        <option value="">—</option>
                        {controllers.map((ct, i) => (
                          <option key={ct.id} value={String(ct.id)}>
                            #{i + 1} - {ct.manufacturer} {ct.model}{ct.location ? ' - ' + ct.location : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>
                      <input
                        value={zn.description}
                        onChange={e => updateZone(zn.id, 'description', e.target.value)}
                        placeholder="Description"
                      />
                    </td>
                    <td style={{ verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {LANDSCAPE_TYPES.map(lt => (
                          <label key={lt} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={zn.landscapeTypes.includes(lt)}
                              onChange={() => toggleMultiSelect(zn.id, 'landscapeTypes', lt)}
                            />
                            {lt}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td style={{ verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {IRRIGATION_TYPES.map(it => (
                          <label key={it} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={zn.irrigationTypes.includes(it)}
                              onChange={() => toggleMultiSelect(zn.id, 'irrigationTypes', it)}
                            />
                            {it}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td rowSpan={2} style={{ verticalAlign: 'top', paddingTop: 8 }}>
                      <button
                        type="button"
                        className="btn btn-danger"
                        data-testid="site-equipment-editor-remove-zone"
                        onClick={() => removeZone(zn.id)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} style={{ paddingTop: 4, paddingBottom: 12, borderBottom: '2px solid #e4e4e7' }}>
                      <div style={{ fontSize: 11, color: '#71717a', marginBottom: 3 }}>Notes</div>
                      <textarea
                        rows={2}
                        value={zn.notes}
                        onChange={e => updateZone(zn.id, 'notes', e.target.value)}
                        placeholder="Notes..."
                        style={{ width: '100%' }}
                      />
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
