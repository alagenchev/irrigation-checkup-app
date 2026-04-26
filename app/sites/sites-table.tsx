'use client'

import type { SiteWithClient } from '@/actions/sites'

interface SitesTableProps {
  sites: SiteWithClient[]
  onEditEquipment: (siteId: string) => void
}

export function SitesTable({ sites, onEditEquipment }: SitesTableProps) {
  if (sites.length === 0) {
    return <p style={{ color: '#a1a1aa', fontSize: 13 }}>No sites yet. Add one above.</p>
  }

  return (
    <table className="data-table" data-testid="sites-table">
      <thead>
        <tr>
          <th>Site Name</th>
          <th>Address</th>
          <th>Client</th>
          <th>Notes</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {sites.map(s => (
          <tr key={s.id} data-testid="sites-table-row">
            <td style={{ fontWeight: 600 }}>{s.name}</td>
            <td>{s.address || '—'}</td>
            <td>{s.clientName || '—'}</td>
            <td>{s.notes || '—'}</td>
            <td>
              <button
                className="btn btn-sm"
                data-testid="sites-table-edit-equipment"
                onClick={() => onEditEquipment(s.id)}
              >
                Edit Equipment
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
