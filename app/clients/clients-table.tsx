'use client'

import { useState } from 'react'
import { updateClient } from '@/actions/clients'
import type { Client } from '@/types'

interface ClientsTableProps {
  clients: Client[]
}

const EDIT_FIELDS: [keyof Client, string][] = [
  ['name',          'Name'],
  ['address',       'Address'],
  ['email',         'Email'],
  ['phone',         'Phone'],
  ['accountType',   'Account Type'],
  ['accountNumber', 'Account #'],
]

export function ClientsTable({ clients }: ClientsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<Client>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit(client: Client) {
    setEditingId(client.id)
    setEditValues({
      name:          client.name,
      address:       client.address       ?? '',
      email:         client.email         ?? '',
      phone:         client.phone         ?? '',
      accountType:   client.accountType   ?? '',
      accountNumber: client.accountNumber ?? '',
    })
    setError(null)
  }

  async function handleSave(id: string) {
    setSaving(true)
    setError(null)
    try {
      const result = await updateClient(id, {
        name:          editValues.name,
        address:       editValues.address       || undefined,
        email:         editValues.email         || undefined,
        phone:         editValues.phone         || undefined,
        accountType:   editValues.accountType   || undefined,
        accountNumber: editValues.accountNumber || undefined,
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

  if (clients.length === 0) {
    return <p style={{ color: '#a1a1aa', fontSize: 13 }}>No clients yet. Add one above.</p>
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Address</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Account Type</th>
          <th>Account #</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {clients.map(c =>
          editingId === c.id ? (
            <tr key={c.id}>
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
                <button className="btn btn-primary btn-sm" onClick={() => handleSave(c.id)} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button className="btn btn-sm" style={{ marginLeft: 4 }} onClick={() => setEditingId(null)}>Cancel</button>
              </td>
            </tr>
          ) : (
            <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => startEdit(c)}>
              <td style={{ fontWeight: 600 }}>{c.name}</td>
              <td>{c.address || '—'}</td>
              <td>{c.email || '—'}</td>
              <td>{c.phone || '—'}</td>
              <td>{c.accountType || '—'}</td>
              <td>{c.accountNumber || '—'}</td>
              <td><button className="btn btn-sm" onClick={e => { e.stopPropagation(); startEdit(c) }}>Edit</button></td>
            </tr>
          )
        )}
      </tbody>
    </table>
  )
}
