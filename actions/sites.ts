'use server'

import { revalidatePath } from 'next/cache'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clients, sites } from '@/lib/schema'
import { createSiteSchema } from '@/lib/validators'
import { getRequiredCompanyId } from '@/lib/tenant'
import type { ActionResult, Site } from '@/types'

export type SiteWithClient = Site & { clientName: string | null; clientAddress: string | null }

export async function getSites(): Promise<SiteWithClient[]> {
  const companyId = await getRequiredCompanyId()
  const rows = await db
    .select({
      id:            sites.id,
      companyId:     sites.companyId,
      name:          sites.name,
      address:       sites.address,
      clientId:      sites.clientId,
      notes:         sites.notes,
      createdAt:     sites.createdAt,
      clientName:    clients.name,
      clientAddress: clients.address,
    })
    .from(sites)
    .leftJoin(clients, eq(sites.clientId, clients.id))
    .where(eq(sites.companyId, companyId))
    .orderBy(asc(sites.name))
  return rows
}

/**
 * Creates a site. If clientName is provided and matches an existing client
 * within the same company, links to that client. If clientName is new,
 * creates the client first.
 */
export async function createSite(_prev: ActionResult<Site> | null, formData: FormData): Promise<ActionResult<Site>> {
  const companyId = await getRequiredCompanyId()

  const raw = {
    name:       formData.get('name'),
    address:    formData.get('address') || undefined,
    clientName: formData.get('client_name') || undefined,
    notes:      formData.get('notes') || undefined,
  }

  const parsed = createSiteSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
  }

  const { name, address, clientName, notes } = parsed.data

  let clientId: number | null = null
  if (clientName) {
    const existing = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.companyId, companyId), eq(clients.name, clientName)))
      .limit(1)

    if (existing.length > 0) {
      clientId = existing[0].id
    } else {
      const [newClient] = await db
        .insert(clients)
        .values({ companyId, name: clientName })
        .returning({ id: clients.id })
      clientId = newClient.id
    }
  }

  const [site] = await db.insert(sites).values({ companyId, name, address, clientId, notes }).returning()
  revalidatePath('/sites')
  return { ok: true, data: site }
}

/**
 * Finds a site by name within the current company or creates one if no match exists.
 * Used by saveInspection to resolve a typed site name to a DB id.
 */
export async function ensureSiteExists(name: string, address?: string): Promise<Site> {
  const companyId = await getRequiredCompanyId()
  const existing = await db
    .select()
    .from(sites)
    .where(and(eq(sites.companyId, companyId), eq(sites.name, name)))
    .limit(1)
  if (existing.length > 0) return existing[0]
  const [created] = await db.insert(sites).values({ companyId, name, address: address ?? null }).returning()
  revalidatePath('/sites')
  return created
}
