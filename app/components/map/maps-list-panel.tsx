'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { getSiteMaps, deleteSiteMap, duplicateSiteMap } from '@/actions/site-maps'
import { CreateMapModal } from './create-map-modal'
import type { SiteMap } from '@/types'

const MapCanvas = dynamic(
  () => import('./map-canvas').then(m => ({ default: m.MapCanvas })),
  { ssr: false, loading: () => <div style={{ height: 260, background: '#1c1c1e', borderRadius: 8 }} /> },
)

interface MapsListPanelProps {
  siteId: string
  siteName: string
  siteAddress?: string | null
  onEditMap: (mapId: string) => void
  onClose: () => void
}

export function MapsListPanel({ siteId, siteName, siteAddress, onEditMap, onClose }: MapsListPanelProps) {
  const [maps, setMaps] = useState<SiteMap[]>([])
  const [loading, setLoading] = useState(true)
  const [previewMapId, setPreviewMapId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const loadMaps = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getSiteMaps(siteId)
      setMaps(result)
      setPreviewMapId(prev => prev ?? result[0]?.id ?? null)
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
    setPreviewMapId(null)
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Maps — {siteName}</h3>
        <button data-testid="maps-list-close" className="btn btn-sm" onClick={onClose}>
          Close
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#a1a1aa', fontSize: 13 }}>Loading maps…</p>
      ) : maps.length === 0 ? (
        <p style={{ color: '#a1a1aa', fontSize: 13 }}>No maps yet. Create one below.</p>
      ) : (
        <>
          {/* Map preview */}
          {previewMapId && (
            <div style={{ marginBottom: 16 }}>
              <MapCanvas
                key={previewMapId}
                mapId={previewMapId}
                siteAddress={siteAddress}
                readOnly
                height={260}
              />
            </div>
          )}

          {/* Map list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {maps.map(map => (
              <div
                key={map.id}
                onClick={() => setPreviewMapId(map.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  border: `1px solid ${previewMapId === map.id ? '#2563eb' : '#e5e7eb'}`,
                  borderRadius: 8,
                  background: previewMapId === map.id ? '#eff6ff' : '#fafafa',
                  cursor: 'pointer',
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
                  onClick={e => { e.stopPropagation(); onEditMap(map.id) }}
                  style={{ background: '#2563eb', color: '#fff' }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-sm"
                  onClick={e => { e.stopPropagation(); handleDuplicate(map.id, map.name) }}
                >
                  Duplicate
                </button>
                <button
                  className="btn btn-sm"
                  onClick={e => { e.stopPropagation(); handleDelete(map.id) }}
                  style={{ color: '#ef4444' }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </>
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
        + Add Map
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
