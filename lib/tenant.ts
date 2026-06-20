import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { companies } from './schema'
import { isSuperAdmin, getSuperAdminSelectedCompanyId } from './super-admin'

/**
 * Resolves the current request's Clerk organisation to an internal company ID.
 *
 * Super admins (listed in SUPER_ADMIN_CLERK_USER_IDS) bypass org-scoping:
 * their selected company is read from a cookie set via the /admin panel.
 *
 * Auto-provisions a `companies` row on first access for a new org so callers
 * never have to worry about setup order.
 *
 * Throws if the authenticated user has no active Clerk organisation — every
 * user must belong to an org for the multi-tenant invariant to hold.
 */
export async function getRequiredCompanyId(): Promise<string> {
  const { userId, orgId } = await auth()

  if (isSuperAdmin(userId)) {
    const selected = await getSuperAdminSelectedCompanyId()
    if (selected) return selected
    throw new Error('Super admin: no company selected — visit /admin to pick one')
  }

  if (!orgId) {
    console.error('[getRequiredCompanyId] No orgId on authenticated session — user has no active Clerk organisation')
    throw new Error(
      'No organisation context — the user must be a member of a Clerk organisation',
    )
  }

  const existing = await db.query.companies.findFirst({
    where: eq(companies.clerkOrgId, orgId),
    columns: { id: true },
  })
  if (existing) return existing.id

  // Claim any company seeded by the data migration before creating a fresh one
  const pending = await db.query.companies.findFirst({
    where: eq(companies.clerkOrgId, '__pending_claim__'),
    columns: { id: true },
  })
  if (pending) {
    await db.update(companies).set({ clerkOrgId: orgId }).where(eq(companies.id, pending.id))
    return pending.id
  }

  // First access: provision a new company row, handling a race condition
  const [created] = await db
    .insert(companies)
    .values({ clerkOrgId: orgId })
    .onConflictDoNothing()
    .returning({ id: companies.id })
  if (created) return created.id

  // A concurrent request won the race — fetch the winner
  const [winner] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))
    .limit(1)
  return winner.id
}
