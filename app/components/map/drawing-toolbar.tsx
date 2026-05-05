'use client'

import type { DrawMode } from './map-canvas'

interface DrawingToolbarProps {
  mode: DrawMode
  onSetMode: (m: DrawMode) => void
  isSynced: boolean
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onZoomIn: () => void
  onZoomOut: () => void
}

export function DrawingToolbar({
  mode,
  onSetMode,
  isSynced,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
}: DrawingToolbarProps) {
  const toolStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid',
    borderColor: active ? '#2563eb' : '#d1d5db',
    background: active ? '#eff6ff' : '#fff',
    color: active ? '#2563eb' : '#374151',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
  })

  return (
    <div
      data-testid="map-toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 0',
        flexWrap: 'wrap',
      }}
    >
      {/* Undo / Redo */}
      <button
        data-testid="map-undo"
        onClick={onUndo}
        disabled={!canUndo}
        style={toolStyle(false)}
        title="Undo"
      >
        ↩ Undo
      </button>
      <button
        data-testid="map-redo"
        onClick={onRedo}
        disabled={!canRedo}
        style={toolStyle(false)}
        title="Redo"
      >
        ↪ Redo
      </button>

      <div style={{ width: 1, height: 24, background: '#e5e7eb', margin: '0 4px' }} />

      {/* Draw tools */}
      <button
        data-testid="map-tool-point"
        onClick={() => onSetMode('point')}
        style={toolStyle(mode === 'point')}
        title="Add point"
      >
        📍 Point
      </button>
      <button
        data-testid="map-tool-zone"
        onClick={() => onSetMode('zone')}
        style={toolStyle(mode === 'zone')}
        title="Draw zone"
      >
        🔷 Zone
      </button>
      <button
        data-testid="map-tool-wire"
        onClick={() => onSetMode('wire')}
        style={toolStyle(mode === 'wire')}
        title="Draw irrigation line"
      >
        〰 Irrigation Line
      </button>

      <div style={{ width: 1, height: 24, background: '#e5e7eb', margin: '0 4px' }} />

      {/* Zoom */}
      <button onClick={onZoomIn} style={toolStyle(false)} title="Zoom in">+</button>
      <button onClick={onZoomOut} style={toolStyle(false)} title="Zoom out">−</button>

      <div style={{ flex: 1 }} />

      {/* Sync status */}
      <span
        data-testid="map-sync-status"
        style={{ fontSize: 12, color: isSynced ? '#16a34a' : '#f59e0b' }}
      >
        {isSynced ? '✓ Saved' : '…Saving'}
      </span>
    </div>
  )
}
