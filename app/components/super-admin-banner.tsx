import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { isSuperAdmin, getSuperAdminSelectedCompanyId } from '@/lib/super-admin'
import { db } from '@/lib/db'
import { companies, companySettings } from '@/lib/schema'

export default async function SuperAdminBanner() {
  const { userId } = await auth()
  if (!isSuperAdmin(userId)) return null

  const selectedId = await getSuperAdminSelectedCompanyId()

  if (!selectedId) {
    return (
      <div style={{ background: '#7c3aed', color: '#fff', padding: '0.4rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <strong>Super Admin</strong>
        <span>No company selected —</span>
        <Link href="/admin" style={{ color: '#e9d5ff', textDecoration: 'underline' }}>pick one</Link>
      </div>
    )
  }

  const [row] = await db
    .select({ companyName: companySettings.companyName, clerkOrgId: companies.clerkOrgId })
    .from(companies)
    .leftJoin(companySettings, eq(companies.id, companySettings.companyId))
    .where(eq(companies.id, selectedId))
    .limit(1)

  const label = row?.companyName || row?.clerkOrgId || selectedId

  return (
    <div style={{ background: '#7c3aed', color: '#fff', padding: '0.4rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <strong>Super Admin</strong>
      <span>Viewing: <strong>{label}</strong></span>
      <Link href="/admin" style={{ color: '#e9d5ff', textDecoration: 'underline' }}>Switch company</Link>
    </div>
  )
}
