'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSiteMaps, deleteSiteMap, duplicateSiteMap } from '@/actions/site-maps'
import { CreateMapModal } from './create-map-modal'
import type { SiteMap } from '@/types'

interface MapsListPanelProps {
  siteId: string
  siteName: string
  onEditMap: (mapId: string) => void
  onClose: () => void
}

export function MapsListPanel({ siteId, siteName, onEditMap, onClose }: MapsListPanelProps) {
  const [maps, setMaps] = useState<SiteMap[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const loadMaps = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getSiteMaps(siteId)
      setMaps(result)
    } finally {
      setLoading(false)
    }
  }, [siteId])

  useEffect(() => {
    loadMaps()
  }, [loadMaps])

  async function handleDelete(mapId: string) {
    if (!window.confirm('Delete this map? This cannot be undone.')) return
    await deleteSiteMap(mapId)
    await loadMaps()
  }

  async function handleDuplicate(mapId: string, currentName: string) {
    const newName = window.prompt('New map name:', `${currentName} (copy)`)
    if (!newName?.trim()) return
    await duplicateSiteMap(mapId, newName.trim())
    await loadMaps()
  }

  function handleCreated(newMapId: string) {
    setShowCreateModal(false)
    loadMaps()
    onEditMap(newMapId)
  }

  function getFeatureCount(drawing: unknown): number {
    if (drawing && typeof drawing === 'object' && 'features' in drawing) {
      const fc = drawing as { features: unknown[] }
      return Array.isArray(fc.features) ? fc.features.length : 0
    }
    return 0
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Maps for {siteName}</h3>
        <button
          data-testid="maps-list-close"
          className="btn btn-sm"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#a1a1aa', fontSize: 13 }}>Loading maps…</p>
      ) : maps.length === 0 ? (
        <p style={{ color: '#a1a1aa', fontSize: 13 }}>No maps yet. Create one below.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {maps.map(map => (
            <div
              key={map.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                background: '#fafafa',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{map.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {getFeatureCount(map.drawing)} features · {new Date(map.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                data-testid={`maps-list-edit-${map.id}`}
                className="btn btn-sm"
                onClick={() => onEditMap(map.id)}
                style={{ background: '#2563eb', color: '#fff' }}
              >
                Edit
              </button>
              <button
                className="btn btn-sm"
                onClick={() => handleDuplicate(map.id, map.name)}
              >
                Duplicate
              </button>
              <button
                className="btn btn-sm"
                onClick={() => handleDelete(map.id)}
                style={{ color: '#ef4444' }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        data-testid="maps-list-create"
        className="btn btn-sm"
        onClick={() => setShowCreateModal(true)}
        style={{
          width: '100%',
          border: '2px dashed #d1d5db',
          background: 'transparent',
          color: '#6b7280',
          padding: '12px',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        + Create New Map
      </button>

      {showCreateModal && (
        <CreateMapModal
          siteId={siteId}
          existingCount={maps.length}
          onCreated={handleCreated}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}
