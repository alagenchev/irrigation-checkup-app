'use client'

import { useState, useRef } from 'react'
import { computeZoneStats, autoName } from '@/lib/map-utils'
import type { ZoneFeatureProperties } from '@/types'

const PRESET_COLORS = ['#22c55e', '#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280']

interface ZoneInfoPanelProps {
  feature: GeoJSON.Feature<GeoJSON.Polygon>
  allFeatures: GeoJSON.Feature[]
  onUpdate: (updated: GeoJSON.Feature) => void
  onDuplicate: () => void
  onDelete: () => void
  onClose: () => void
  onPreview?: (opacity: number, color: string) => void
}

export function ZoneInfoPanel({
  feature,
  allFeatures,
  onUpdate,
  onDuplicate,
  onDelete,
  onClose,
  onPreview,
}: ZoneInfoPanelProps) {
  const props = feature.properties as ZoneFeatureProperties
  const [name, setName] = useState(props.name ?? '')
  const [color, setColor] = useState(props.color ?? '#22c55e')
  const [opacity, setOpacity] = useState(props.opacity ?? 25)
  const [role, setRole] = useState<ZoneFeatureProperties['role']>(props.role ?? 'zone')
  const [areaType, setAreaType] = useState<ZoneFeatureProperties['areaType']>(props.areaType ?? 'turf')
  const [sunExposure, setSunExposure] = useState<ZoneFeatureProperties['sunExposure']>(props.sunExposure ?? 'sunny')
  const [grassType, setGrassType] = useState(props.grassType ?? '')
  const [photoUrls, setPhotoUrls] = useState<string[]>(() => {
    const raw = props.photoUrls
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
    return []
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stats = feature.geometry?.coordinates?.[0]
    ? computeZoneStats((feature.geometry.coordinates[0] as [number, number][]).slice(0, -1))
    : null

  function handleDone() {
    onUpdate({
      ...feature,
      properties: {
        ...props,
        name,
        color,
        opacity,
        role,
        areaType,
        sunExposure,
        grassType,
        photoUrls,
        areaSqFt: stats?.areaSqFt ?? props.areaSqFt,
        perimeterFt: stats?.perimeterFt ?? props.perimeterFt,
      } as ZoneFeatureProperties,
    })
    onClose()
  }

  function handleDelete() {
    onDelete()
    onClose()
  }

  function handleAutoName() {
    setName(autoName(allFeatures, 'zone'))
  }

  function handlePhotoAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target?.result as string
      setPhotoUrls(prev => [...prev, url])
    }
    reader.readAsDataURL(file)
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    borderRadius: 20,
    border: '1px solid',
    borderColor: active ? '#2563eb' : '#d1d5db',
    background: active ? '#eff6ff' : '#f9fafb',
    color: active ? '#2563eb' : '#374151',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
  })

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
        zIndex: 20,
        maxHeight: '70%',
        overflowY: 'auto',
        padding: 20,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <h4 style={{ flex: 1, margin: 0 }}>Zone Info</h4>
        <button className="btn btn-sm" onClick={onDuplicate}>Duplicate</button>
        <button
          data-testid="zone-info-done"
          className="btn btn-sm"
          onClick={handleDone}
          style={{ background: '#2563eb', color: '#fff' }}
        >
          Done
        </button>
      </div>

      {/* Zone size (read-only) */}
      {stats && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f3f4f6', borderRadius: 8, fontSize: 13 }}>
          <strong>Area:</strong> {stats.areaSqFt.toLocaleString()} sq ft &nbsp;·&nbsp;
          <strong>Perimeter:</strong> {stats.perimeterFt.toLocaleString()} ft
        </div>
      )}

      {/* Zone name */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Zone Name</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            data-testid="zone-info-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Front Lawn"
            style={{
              flex: 1,
              padding: '6px 10px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14,
            }}
          />
          <button className="btn btn-sm" onClick={handleAutoName} title="Auto-name">Auto</button>
        </div>
      </div>

      {/* Fill opacity */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
          Fill Opacity: {opacity}%
        </label>
        <input
          data-testid="zone-info-opacity"
          type="range"
          min={0}
          max={100}
          step={5}
          value={opacity}
          onChange={e => { const v = Number(e.target.value); setOpacity(v); onPreview?.(v, color) }}
          style={{ width: '100%' }}
        />
      </div>

      {/* Color picker */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>Color</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: color,
              border: '2px solid #d1d5db',
              flexShrink: 0,
            }}
          />
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => { setColor(c); onPreview?.(opacity, c) }}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: c,
                border: c === color ? '3px solid #111' : '2px solid transparent',
                cursor: 'pointer',
                padding: 0,
              }}
              title={c}
            />
          ))}
          <input
            data-testid="zone-info-color-hex"
            type="text"
            value={color}
            onChange={e => { setColor(e.target.value); onPreview?.(opacity, e.target.value) }}
            style={{
              width: 90,
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 12,
              fontFamily: 'monospace',
            }}
          />
        </div>
      </div>

      {/* Zone Metadata */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>Polygon Role</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['zone', 'hydrozone', 'irrigated', 'exclusion'] as const).map(r => (
            <button
              key={r}
              data-testid={`zone-info-role-${r}`}
              onClick={() => setRole(r)}
              style={pillStyle(role === r)}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>Area Type</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['turf', 'bed', 'other'] as const).map(t => (
            <button
              key={t}
              data-testid={`zone-info-area-type-${t}`}
              onClick={() => setAreaType(t)}
              style={pillStyle(areaType === t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>Sun Exposure</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['sunny', 'mixed', 'shade'] as const).map(s => (
            <button
              key={s}
              data-testid={`zone-info-sun-${s}`}
              onClick={() => setSunExposure(s)}
              style={pillStyle(sunExposure === s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Grass Type</label>
        <input
          data-testid="zone-info-grass-type"
          type="text"
          value={grassType}
          onChange={e => setGrassType(e.target.value)}
          placeholder="e.g. Bermuda, Fescue…"
          style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 14,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Photos */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>Photos</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {photoUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Zone photo ${i + 1}`}
              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }}
            />
          ))}
        </div>
        <button
          className="btn btn-sm"
          onClick={() => fileInputRef.current?.click()}
        >
          + Add Photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handlePhotoAdd}
        />
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          data-testid="zone-info-cancel"
          className="btn btn-sm"
          onClick={onClose}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button
          data-testid="zone-info-delete"
          className="btn btn-sm"
          onClick={handleDelete}
          style={{ flex: 1, color: '#ef4444', borderColor: '#ef4444' }}
        >
          Delete Zone
        </button>
      </div>
    </div>
  )
}
