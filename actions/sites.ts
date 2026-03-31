'use server'

import { revalidatePath } from 'next/cache'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clients, sites } from '@/lib/schema'
import { createSiteSchema } from '@/lib/validators'
import type { ActionResult, Site } from '@/types'

export type SiteWithClient = Site & { clientName: string | null; clientAddress: string | null }

export async function getSites(): Promise<SiteWithClient[]> {
  const rows = await db
    .select({
      id:            sites.id,
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
    .orderBy(asc(sites.name))
  return rows
}

/**
 * Creates a site. If clientName is provided and matches an existing client,
 * links to that client. If clientName is new, creates the client first.
 */
export async function createSite(_prev: ActionResult<Site> | null, formData: FormData): Promise<ActionResult<Site>> {
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
      .where(eq(clients.name, clientName))
      .limit(1)

    if (existing.length > 0) {
      clientId = existing[0].id
    } else {
      const [newClient] = await db.insert(clients).values({ name: clientName }).returning({ id: clients.id })
      clientId = newClient.id
    }
  }

  const [site] = await db.insert(sites).values({ name, address, clientId, notes }).returning()
  revalidatePath('/sites')
  return { ok: true, data: site }
}
