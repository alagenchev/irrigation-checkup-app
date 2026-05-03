'use client'

import { useState } from 'react'
import { createSiteMap } from '@/actions/site-maps'

interface CreateMapModalProps {
  siteId: string
  existingCount: number
  onCreated: (mapId: string) => void
  onCancel: () => void
}

export function CreateMapModal({ siteId, existingCount, onCreated, onCancel }: CreateMapModalProps) {
  const [name, setName] = useState(`Map ${existingCount + 1}`)
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    try {
      const map = await createSiteMap(siteId, name.trim())
      onCreated(map.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          width: 360,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <h3 style={{ margin: '0 0 16px' }}>New Map</h3>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#6b7280' }}>
          Map name
        </label>
        <input
          data-testid="create-map-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 16,
            boxSizing: 'border-box',
          }}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            data-testid="create-map-cancel"
            className="btn btn-sm"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            data-testid="create-map-submit"
            className="btn btn-sm"
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            style={{ background: '#2563eb', color: '#fff' }}
          >
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
