'use client'

import { useState } from 'react'

const PRESET_COLORS = ['#22c55e', '#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280']

interface PointInfoPanelProps {
  pointType: string
  initialName?: string
  initialColor?: string
  onConfirm: (props: { name: string; color: string }) => void
  onCancel: () => void
  onDelete: () => void
}

export function PointInfoPanel({
  pointType,
  initialName = '',
  initialColor = '#3b82f6',
  onConfirm,
  onCancel,
  onDelete,
}: PointInfoPanelProps) {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState(initialColor)

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
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <h4 style={{ flex: 1, margin: 0 }}>{label}</h4>
        <button
          className="btn btn-sm"
          onClick={() => onConfirm({ name, color })}
          style={{ background: '#2563eb', color: '#fff' }}
        >
          Done
        </button>
      </div>

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
              onClick={() => setColor(c)}
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
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-sm" onClick={onCancel} style={{ flex: 1 }}>
          Cancel
        </button>
        <button
          className="btn btn-sm"
          onClick={onDelete}
          style={{ flex: 1, color: '#ef4444', borderColor: '#ef4444' }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
