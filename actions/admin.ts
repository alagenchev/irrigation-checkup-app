'use server'

import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { companies, companySettings } from '@/lib/schema'
import { isSuperAdmin, setSuperAdminSelectedCompanyId, clearSuperAdminSelectedCompanyId } from '@/lib/super-admin'

async function requireSuperAdmin() {
  const { userId } = await auth()
  if (!isSuperAdmin(userId)) throw new Error('Forbidden')
}

export type AdminCompany = {
  id: string
  clerkOrgId: string
  createdAt: Date
  companyName: string | null
  companyPhone: string | null
  companyAddress: string | null
}

export async function getAllCompanies(): Promise<AdminCompany[]> {
  await requireSuperAdmin()
  const rows = await db
    .select({
      id:           companies.id,
      clerkOrgId:   companies.clerkOrgId,
      createdAt:    companies.createdAt,
      companyName:  companySettings.companyName,
      companyPhone: companySettings.companyPhone,
      companyAddress: companySettings.companyAddress,
    })
    .from(companies)
    .leftJoin(companySettings, eq(companies.id, companySettings.companyId))
    .orderBy(asc(companies.createdAt))
  return rows
}

export async function selectCompany(companyId: string) {
  await requireSuperAdmin()
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    columns: { id: true },
  })
  if (!company) throw new Error(`Company ${companyId} not found`)
  await setSuperAdminSelectedCompanyId(companyId)
  redirect('/')
}

export async function clearSelectedCompany() {
  await requireSuperAdmin()
  await clearSuperAdminSelectedCompanyId()
  redirect('/admin')
}
