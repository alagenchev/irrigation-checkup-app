'use client'

import { useState } from 'react'

interface AddPointPanelProps {
  onSelect: (type: string) => void
  onClose: () => void
}

type SubView = null | 'system'

export function AddPointPanel({ onSelect, onClose }: AddPointPanelProps) {
  const [subView, setSubView] = useState<SubView>(null)

  const gridBtnStyle: React.CSSProperties = {
    padding: '16px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    background: '#f9fafb',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'center',
  }

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
      <h4 style={{ margin: '0 0 6px' }}>Add a Point</h4>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
        {subView === 'system'
          ? 'Choose a system component:'
          : 'What kind of point are you adding?'}
      </p>

      {subView === null ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <button
            data-testid="add-point-heads"
            style={gridBtnStyle}
            onClick={() => onSelect('head')}
          >
            💦 Heads
          </button>
          <button
            data-testid="add-point-system"
            style={gridBtnStyle}
            onClick={() => setSubView('system')}
          >
            ⚙️ System Components
          </button>
          <button
            data-testid="add-point-repair"
            style={gridBtnStyle}
            onClick={() => onSelect('repair')}
          >
            🔧 Repair
          </button>
          <button
            data-testid="add-point-other"
            style={gridBtnStyle}
            onClick={() => onSelect('other')}
          >
            📌 Other
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <button
            style={{ ...gridBtnStyle, textAlign: 'left' }}
            onClick={() => onSelect('controller')}
          >
            🕹️ Controller
          </button>
          <button
            style={{ ...gridBtnStyle, textAlign: 'left' }}
            onClick={() => onSelect('backflow')}
          >
            🔒 Backflow
          </button>
          <button
            style={{ ...gridBtnStyle, textAlign: 'left', color: '#6b7280' }}
            onClick={() => setSubView(null)}
          >
            ← Back
          </button>
        </div>
      )}

      <button
        data-testid="add-point-cancel"
        className="btn btn-sm"
        onClick={onClose}
        style={{ width: '100%' }}
      >
        Cancel
      </button>
    </div>
  )
}
