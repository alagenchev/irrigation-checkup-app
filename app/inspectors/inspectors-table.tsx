'use client'

import { useState } from 'react'
import { updateInspector } from '@/actions/inspectors'
import type { Inspector } from '@/types'

interface Props { inspectors: Inspector[] }

const EDIT_FIELDS: [keyof Inspector, string][] = [
  ['firstName',  'First Name'],
  ['lastName',   'Last Name'],
  ['email',      'Email'],
  ['phone',      'Phone'],
  ['licenseNum', 'License #'],
]

export function InspectorsTable({ inspectors }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Partial<Inspector>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit(inspector: Inspector) {
    setEditingId(inspector.id)
    setEditValues({
      firstName:  inspector.firstName,
      lastName:   inspector.lastName,
      email:      inspector.email      ?? '',
      phone:      inspector.phone      ?? '',
      licenseNum: inspector.licenseNum ?? '',
    })
    setError(null)
  }

  async function handleSave(id: number) {
    setSaving(true)
    setError(null)
    try {
      const result = await updateInspector(id, {
        firstName:  editValues.firstName,
        lastName:   editValues.lastName,
        email:      editValues.email      || undefined,
        phone:      editValues.phone      || undefined,
        licenseNum: editValues.licenseNum || undefined,
      })
      if (result.ok) {
        setEditingId(null)
      } else {
        setError(result.error)
      }
    } finally {
      setSaving(false)
    }
  }

  if (inspectors.length === 0) {
    return <p style={{ color: '#a1a1aa', fontSize: 13 }}>No inspectors yet. Add one above.</p>
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>First Name</th><th>Last Name</th><th>Email</th><th>Phone</th><th>License #</th><th></th>
        </tr>
      </thead>
      <tbody>
        {inspectors.map(insp => (
          editingId === insp.id ? (
            <tr key={insp.id}>
              {EDIT_FIELDS.map(([field]) => (
                <td key={field as string}>
                  <input
                    value={(editValues[field] as string) ?? ''}
                    onChange={e => setEditValues(v => ({ ...v, [field]: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </td>
              ))}
              <td style={{ whiteSpace: 'nowrap' }}>
                {error && <span style={{ color: '#ef4444', fontSize: 11, display: 'block', marginBottom: 4 }}>{error}</span>}
                <button className="btn btn-primary btn-sm" onClick={() => handleSave(insp.id)} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button className="btn btn-sm" style={{ marginLeft: 4 }} onClick={() => setEditingId(null)}>Cancel</button>
              </td>
            </tr>
          ) : (
            <tr key={insp.id} style={{ cursor: 'pointer' }} onClick={() => startEdit(insp)}>
              <td style={{ fontWeight: 600 }}>{insp.firstName}</td>
              <td style={{ fontWeight: 600 }}>{insp.lastName}</td>
              <td>{insp.email      || '—'}</td>
              <td>{insp.phone      || '—'}</td>
              <td>{insp.licenseNum || '—'}</td>
              <td><button className="btn btn-sm" onClick={e => { e.stopPropagation(); startEdit(insp) }}>Edit</button></td>
            </tr>
          )
        ))}
      </tbody>
    </table>
  )
}
