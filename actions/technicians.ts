'use server'

import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { technicians } from '@/lib/schema'
import { getRequiredCompanyId } from '@/lib/tenant'
import type { Technician } from '@/types'

export async function getTechnicians(): Promise<Technician[]> {
  const companyId = await getRequiredCompanyId()
  return db
    .select()
    .from(technicians)
    .where(eq(technicians.companyId, companyId))
    .orderBy(asc(technicians.name))
}

/**
 * Finds a technician by name within the current company or creates one if no match exists.
 * Called when generating an inspection PDF to persist new technician names.
 */
export async function ensureTechnicianExists(name: string): Promise<Technician> {
  const companyId = await getRequiredCompanyId()

  const existing = await db
    .select()
    .from(technicians)
    .where(and(eq(technicians.companyId, companyId), eq(technicians.name, name)))
    .limit(1)

  if (existing.length > 0) return existing[0]

  const [created] = await db
    .insert(technicians)
    .values({ companyId, name })
    .onConflictDoNothing()
    .returning()

  // If onConflictDoNothing swallowed a race-condition duplicate, fetch the winner
  if (!created) {
    const [winner] = await db
      .select()
      .from(technicians)
      .where(and(eq(technicians.companyId, companyId), eq(technicians.name, name)))
      .limit(1)
    return winner
  }

  return created
}
