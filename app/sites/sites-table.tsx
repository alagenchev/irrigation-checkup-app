import type { SiteWithClient } from '@/actions/sites'

interface SitesTableProps {
  sites: SiteWithClient[]
}

export function SitesTable({ sites }: SitesTableProps) {
  if (sites.length === 0) {
    return <p style={{ color: '#a1a1aa', fontSize: 13 }}>No sites yet. Add one above.</p>
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Site Name</th>
          <th>Address</th>
          <th>Client</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {sites.map(s => (
          <tr key={s.id}>
            <td style={{ fontWeight: 600 }}>{s.name}</td>
            <td>{s.address || '—'}</td>
            <td>{s.clientName || '—'}</td>
            <td>{s.notes || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
