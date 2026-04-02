'use client'

import { useRouter } from 'next/navigation'

type InspectionRow = {
  siteVisitId:    string
  datePerformed:  string
  inspectionType: string
  status:         string
  siteName:       string
  clientName:     string | null
  inspectorName:  string | null
}

const STATUS_COLORS: Record<string, string> = {
  'New':         '#3b82f6',
  'In Progress': '#f59e0b',
  'Completed':   '#22c55e',
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#a1a1aa'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 600, color: '#ffffff', background: color,
    }}>
      {status}
    </span>
  )
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

export function InspectionsTable({ rows }: { rows: InspectionRow[] }) {
  const router = useRouter()

  if (rows.length === 0) {
    return (
      <p style={{ color: '#71717a', padding: '24px 0', textAlign: 'center' }}>
        No inspections saved yet. Fill out an inspection and click Save.
      </p>
    )
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Site</th>
          <th>Client</th>
          <th>Inspector</th>
          <th>Type</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr
            key={row.siteVisitId}
            style={{ cursor: 'pointer' }}
            onClick={() => router.push(`/inspections/${row.siteVisitId}`)}
          >
            <td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.datePerformed)}</td>
            <td>{row.siteName}</td>
            <td style={{ color: row.clientName     ? '#ffffff' : '#71717a' }}>{row.clientName     ?? '—'}</td>
            <td style={{ color: row.inspectorName  ? '#ffffff' : '#71717a' }}>{row.inspectorName  ?? '—'}</td>
            <td>{row.inspectionType}</td>
            <td><StatusBadge status={row.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
