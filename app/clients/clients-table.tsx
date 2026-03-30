import type { Client } from '@/types'

interface ClientsTableProps {
  clients: Client[]
}

export function ClientsTable({ clients }: ClientsTableProps) {
  if (clients.length === 0) {
    return <p style={{ color: '#a1a1aa', fontSize: 13 }}>No clients yet. Add one above.</p>
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Address</th>
          <th>Account Type</th>
          <th>Account #</th>
        </tr>
      </thead>
      <tbody>
        {clients.map(c => (
          <tr key={c.id}>
            <td style={{ fontWeight: 600 }}>{c.name}</td>
            <td>{c.phone || '—'}</td>
            <td>{c.email || '—'}</td>
            <td>{c.address || '—'}</td>
            <td>{c.accountType || '—'}</td>
            <td>{c.accountNumber || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
