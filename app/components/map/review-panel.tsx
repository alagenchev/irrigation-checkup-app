'use client'

interface ReviewPanelProps {
  features: GeoJSON.Feature[]
  onClose: () => void
}

export function ReviewPanel({ features, onClose }: ReviewPanelProps) {
  const zones = features.filter(f => f.properties?.featureType === 'zone')
  const controllers = features.filter(f => f.properties?.featureType === 'controller')
  const heads = features.filter(f => f.properties?.featureType === 'head')
  const wires = features.filter(f => f.properties?.featureType === 'wire')
  const others = features.filter(f =>
    !['zone', 'controller', 'head', 'wire'].includes(f.properties?.featureType as string)
  )

  const totalArea = zones.reduce(
    (sum, f) => sum + ((f.properties?.areaSqFt as number | undefined) ?? 0),
    0
  )

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#fff',
        borderRadius: 8,
        overflowY: 'auto',
        zIndex: 30,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>Map Review</h3>
        <button
          data-testid="review-done"
          className="btn btn-sm"
          onClick={onClose}
          style={{ background: '#2563eb', color: '#fff' }}
        >
          Done
        </button>
      </div>

      {/* Feature count summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          { label: 'Zones', count: zones.length, color: '#22c55e' },
          { label: 'Controllers', count: controllers.length, color: '#3b82f6' },
          { label: 'Heads', count: heads.length, color: '#f59e0b' },
          { label: 'Wires', count: wires.length, color: '#6b7280' },
        ].map(({ label, count, color }) => (
          <div
            key={label}
            style={{
              padding: '12px 16px',
              background: '#f9fafb',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, color }}>{count}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Total irrigated area */}
      {zones.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            background: '#f0fdf4',
            borderRadius: 8,
            marginBottom: 20,
            border: '1px solid #bbf7d0',
          }}
        >
          <div style={{ fontSize: 13, color: '#166534' }}>
            <strong>Total mapped area:</strong> {totalArea.toLocaleString()} sq ft
          </div>
        </div>
      )}

      {/* Zones list */}
      {zones.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 14, color: '#374151' }}>Zones</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {zones.map((zone, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: (zone.properties?.color as string | undefined) ?? '#22c55e',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {(zone.properties?.name as string | undefined) || `Zone ${i + 1}`}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {((zone.properties?.areaSqFt as number | undefined) ?? 0).toLocaleString()} sq ft
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Points list */}
      {[...controllers, ...heads, ...others].length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 14, color: '#374151' }}>Points</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...controllers, ...heads, ...others].map((pt, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: (pt.properties?.color as string | undefined) ?? '#3b82f6',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  {(pt.properties?.name as string | undefined) || 'Unnamed'}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'capitalize' }}>
                  {pt.properties?.featureType as string}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {features.length === 0 && (
        <p style={{ color: '#a1a1aa', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
          No features drawn yet.
        </p>
      )}
    </div>
  )
}
