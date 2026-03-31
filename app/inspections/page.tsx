import Link from 'next/link'
import { getInspections } from '@/actions/site-visits'
import { InspectionsTable } from './inspections-table'

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const sp   = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))

  const { rows, total, pageSize } = await getInspections(page)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <main className="container">
      <div className="page-header">
        <h1>Site Inspections</h1>
        <Link href="/" className="btn btn-primary">+ New Checkup</Link>
      </div>

      <section className="card">
        <InspectionsTable rows={rows} />
      </section>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 }}>
        {page > 1 ? (
          <Link href={`?page=${page - 1}`} className="btn btn-sm">← Previous</Link>
        ) : (
          <span className="btn btn-sm" style={{ opacity: 0.35, cursor: 'default' }}>← Previous</span>
        )}

        <span style={{ fontSize: 13, color: '#a1a1aa' }}>
          Page {page} of {totalPages} &nbsp;·&nbsp; {total} inspection{total !== 1 ? 's' : ''}
        </span>

        {page < totalPages ? (
          <Link href={`?page=${page + 1}`} className="btn btn-sm">Next →</Link>
        ) : (
          <span className="btn btn-sm" style={{ opacity: 0.35, cursor: 'default' }}>Next →</span>
        )}
      </div>
    </main>
  )
}
