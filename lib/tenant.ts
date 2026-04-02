import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { companies } from './schema'

/**
 * Resolves the current request's Clerk organisation to an internal company ID.
 *
 * Auto-provisions a `companies` row on first access for a new org so callers
 * never have to worry about setup order.
 *
 * Throws if the authenticated user has no active Clerk organisation — every
 * user must belong to an org for the multi-tenant invariant to hold.
 */
export async function getRequiredCompanyId(): Promise<number> {
  const { orgId } = await auth()
  if (!orgId) {
    throw new Error(
      'No organisation context — the user must be a member of a Clerk organisation',
    )
  }

  const existing = await db.query.companies.findFirst({
    where: eq(companies.clerkOrgId, orgId),
    columns: { id: true },
  })
  if (existing) return existing.id

  // First access: provision the company row, handling a potential race condition
  const [created] = await db
    .insert(companies)
    .values({ clerkOrgId: orgId })
    .onConflictDoNothing()
    .returning({ id: companies.id })

  if (created) return created.id

  // A concurrent request won the race — fetch the winner's row
  const [winner] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))
    .limit(1)
  return winner.id
}
