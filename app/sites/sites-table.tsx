'use client'

import { useState } from 'react'
import type { SiteWithClient } from '@/actions/sites'

type SortKey = 'name' | 'address' | 'clientName' | 'notes' | 'createdAt'
type SortDir = 'asc' | 'desc'

interface SitesTableProps {
  sites: SiteWithClient[]
  onEditEquipment: (siteId: string) => void
  onViewMap: (siteId: string) => void
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, fontSize: 11 }}>
      {dir === 'asc' ? '↑' : '↓'}
    </span>
  )
}

export function SitesTable({ sites, onEditEquipment, onViewMap }: SitesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'createdAt' ? 'desc' : 'asc')
    }
  }

  const sorted = [...sites].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'createdAt') {
      cmp = new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
    } else {
      const av = (a[sortKey] ?? '').toLowerCase()
      const bv = (b[sortKey] ?? '').toLowerCase()
      cmp = av < bv ? -1 : av > bv ? 1 : 0
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  function thStyle(key: SortKey): React.CSSProperties {
    return { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }
  }

  if (sites.length === 0) {
    return <p style={{ color: '#a1a1aa', fontSize: 13 }}>No sites yet. Add one above.</p>
  }

  return (
    <table className="data-table" data-testid="sites-table">
      <thead>
        <tr>
          <th style={thStyle('name')} onClick={() => handleSort('name')}>
            Site Name <SortIndicator active={sortKey === 'name'} dir={sortKey === 'name' ? sortDir : 'asc'} />
          </th>
          <th style={thStyle('address')} onClick={() => handleSort('address')}>
            Address <SortIndicator active={sortKey === 'address'} dir={sortKey === 'address' ? sortDir : 'asc'} />
          </th>
          <th style={thStyle('clientName')} onClick={() => handleSort('clientName')}>
            Client <SortIndicator active={sortKey === 'clientName'} dir={sortKey === 'clientName' ? sortDir : 'asc'} />
          </th>
          <th style={thStyle('notes')} onClick={() => handleSort('notes')}>
            Notes <SortIndicator active={sortKey === 'notes'} dir={sortKey === 'notes' ? sortDir : 'asc'} />
          </th>
          <th style={thStyle('createdAt')} onClick={() => handleSort('createdAt')}>
            Date Added <SortIndicator active={sortKey === 'createdAt'} dir={sortKey === 'createdAt' ? sortDir : 'desc'} />
          </th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(s => (
          <tr key={s.id} data-testid="sites-table-row">
            <td style={{ fontWeight: 600 }}>{s.name}</td>
            <td>{s.address || '—'}</td>
            <td>{s.clientName || '—'}</td>
            <td>{s.notes || '—'}</td>
            <td style={{ color: '#a1a1aa', fontSize: 13, whiteSpace: 'nowrap' }}>
              {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
            </td>
            <td>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-sm"
                  data-testid="sites-table-edit-equipment"
                  onClick={() => onEditEquipment(s.id)}
                >
                  Edit Equipment
                </button>
                <button
                  className="btn btn-sm"
                  data-testid="sites-table-view-map"
                  onClick={() => onViewMap(s.id)}
                >
                  Maps
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
