'use client'

import { useState } from 'react'
import { autoName } from '@/lib/map-utils'

const PRESET_COLORS = ['#22c55e', '#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280']

interface ConfigurePointPanelProps {
  pointType: string
  coord: [number, number]
  allFeatures: GeoJSON.Feature[]
  onConfirm: (feature: GeoJSON.Feature) => void
  onBack: () => void
}

export function ConfigurePointPanel({
  pointType,
  coord,
  allFeatures,
  onConfirm,
  onBack,
}: ConfigurePointPanelProps) {
  const defaultName = pointType === 'zone'
    ? autoName(allFeatures, 'zone')
    : pointType === 'controller'
      ? autoName(allFeatures, 'controller')
      : pointType === 'head'
        ? autoName(allFeatures, 'head')
        : `${pointType.charAt(0).toUpperCase() + pointType.slice(1)} 1`

  const [name, setName] = useState(defaultName)
  const [color, setColor] = useState('#3b82f6')

  function handleCreate() {
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: coord,
      },
      properties: {
        featureType: pointType,
        name,
        color,
      },
    }
    onConfirm(feature)
  }

  const label = pointType.charAt(0).toUpperCase() + pointType.slice(1)

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
        padding: 20,
      }}
    >
      <h4 style={{ margin: '0 0 16px' }}>Configure {label}</h4>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
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

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>Color</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: c,
                border: c === color ? '3px solid #111' : '2px solid transparent',
                cursor: 'pointer',
                padding: 0,
              }}
              title={c}
            />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-sm" onClick={onBack} style={{ flex: 1 }}>
          Back
        </button>
        <button
          data-testid="configure-point-create"
          className="btn btn-sm"
          onClick={handleCreate}
          disabled={!name.trim()}
          style={{ flex: 1, background: '#2563eb', color: '#fff' }}
        >
          ✓ Create
        </button>
      </div>
    </div>
  )
}
