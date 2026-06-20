import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isSuperAdmin } from '@/lib/super-admin'
import { getAllCompanies, selectCompany, clearSelectedCompany } from '@/actions/admin'

export default async function AdminPage() {
  const { userId } = await auth()
  if (!isSuperAdmin(userId)) redirect('/')

  const companies = await getAllCompanies()

  return (
    <main style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Super Admin — Company Selector</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Select a company to view and edit its data. All subsequent navigation will be scoped to that company.
      </p>

      <form action={clearSelectedCompany} style={{ marginBottom: '1.5rem' }}>
        <button type="submit" style={{ background: '#eee', border: '1px solid #ccc', borderRadius: 4, padding: '0.4rem 1rem', cursor: 'pointer' }}>
          Clear selection (return here)
        </button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '0.5rem' }}>Company Name</th>
            <th style={{ padding: '0.5rem' }}>Phone</th>
            <th style={{ padding: '0.5rem' }}>Address</th>
            <th style={{ padding: '0.5rem' }}>Created</th>
            <th style={{ padding: '0.5rem' }}>Org ID</th>
            <th style={{ padding: '0.5rem' }}></th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.5rem', fontWeight: 500 }}>{c.companyName || <em style={{ color: '#999' }}>—</em>}</td>
              <td style={{ padding: '0.5rem' }}>{c.companyPhone || '—'}</td>
              <td style={{ padding: '0.5rem' }}>{c.companyAddress || '—'}</td>
              <td style={{ padding: '0.5rem', fontSize: '0.85rem', color: '#555' }}>
                {new Date(c.createdAt).toLocaleDateString()}
              </td>
              <td style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#999', fontFamily: 'monospace' }}>{c.clerkOrgId}</td>
              <td style={{ padding: '0.5rem' }}>
                <form action={selectCompany.bind(null, c.id)}>
                  <button
                    type="submit"
                    style={{ background: '#0070f3', color: '#fff', border: 'none', borderRadius: 4, padding: '0.35rem 0.9rem', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    View
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {companies.length === 0 && (
        <p style={{ color: '#999', marginTop: '1rem' }}>No companies found.</p>
      )}
    </main>
  )
}
