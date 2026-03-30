'use client'

import { useState, useEffect } from 'react'

type Client = {
  id: number
  name: string
  address: string
  phone: string
  email: string
  account_type: string
  account_number: string
  created_at: string
}

const ACCOUNT_TYPES = ['Commercial', 'Residential', 'HOA', 'Municipal']

const emptyForm = {
  name: '', address: '', phone: '', email: '', account_type: 'Residential', account_number: '',
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadClients() {
    const res = await fetch('/api/clients')
    if (res.ok) setClients(await res.json())
  }

  useEffect(() => { loadClients() }, [])

  function setField(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save client')
      }
      setForm(emptyForm)
      await loadClients()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="container">
      <div className="page-header">
        <h1>Clients</h1>
      </div>

      {/* ADD CLIENT FORM */}
      <section className="card">
        <h2>Add Client</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid-3">
            <div className="field">
              <label>Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Client name" required />
            </div>
            <div className="field">
              <label>Phone</label>
              <input type="text" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="(555) 000-0000" />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="client@email.com" />
            </div>
            <div className="field">
              <label>Address</label>
              <input type="text" value={form.address} onChange={e => setField('address', e.target.value)} placeholder="123 Main St, City, TX" />
            </div>
            <div className="field">
              <label>Account Type</label>
              <select value={form.account_type} onChange={e => setField('account_type', e.target.value)}>
                {ACCOUNT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Account Number</label>
              <input type="text" value={form.account_number} onChange={e => setField('account_number', e.target.value)} placeholder="Account #" />
            </div>
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{error}</p>}
          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Add Client'}
            </button>
          </div>
        </form>
      </section>

      {/* CLIENTS LIST */}
      <section className="card">
        <h2>All Clients ({clients.length})</h2>
        {clients.length === 0 ? (
          <p style={{ color: '#a1a1aa', fontSize: 13 }}>No clients yet. Add one above.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th>Account Type</th>
                <th>Account #</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.address || '—'}</td>
                  <td>{c.account_type || '—'}</td>
                  <td>{c.account_number || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
