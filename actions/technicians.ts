'use server'

import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { technicians } from '@/lib/schema'
import type { Technician } from '@/types'

export async function getTechnicians(): Promise<Technician[]> {
  return db.select().from(technicians).orderBy(asc(technicians.name))
}

/**
 * Finds a technician by name or creates one if no match exists.
 * Called when generating an inspection PDF to persist new technician names.
 */
export async function ensureTechnicianExists(name: string): Promise<Technician> {
  const existing = await db
    .select()
    .from(technicians)
    .where(eq(technicians.name, name))
    .limit(1)

  if (existing.length > 0) return existing[0]

  const [created] = await db
    .insert(technicians)
    .values({ name })
    .onConflictDoNothing()
    .returning()

  // If onConflictDoNothing swallowed a race-condition duplicate, fetch the winner
  if (!created) {
    const [winner] = await db
      .select()
      .from(technicians)
      .where(eq(technicians.name, name))
      .limit(1)
    return winner
  }

  return created
}
