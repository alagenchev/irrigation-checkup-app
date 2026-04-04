'use server'

import { revalidatePath } from 'next/cache'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clients } from '@/lib/schema'
import { createClientSchema } from '@/lib/validators'
import { getRequiredCompanyId } from '@/lib/tenant'
import type { ActionResult, Client } from '@/types'

export async function getClients(): Promise<Client[]> {
  const companyId = await getRequiredCompanyId()
  return db
    .select()
    .from(clients)
    .where(eq(clients.companyId, companyId))
    .orderBy(asc(clients.name))
}

export async function createClient(_prev: ActionResult<Client> | null, formData: FormData): Promise<ActionResult<Client>> {
  const companyId = await getRequiredCompanyId()

  const raw = {
    name:          formData.get('name'),
    address:       formData.get('address') || undefined,
    phone:         formData.get('phone')   || undefined,
    email:         formData.get('email')   || undefined,
    accountType:   formData.get('account_type')   || undefined,
    accountNumber: formData.get('account_number') || undefined,
  }

  const parsed = createClientSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
  }

  const [client] = await db.insert(clients).values({ ...parsed.data, companyId }).returning()
  revalidatePath('/clients')
  return { ok: true, data: client }
}

/**
 * Finds a client by name within the current company or creates one if no match exists.
 * If email is provided and differs from the existing client, updates it.
 * Used when generating an inspection PDF to persist new customer names and update contact info.
 */
export async function ensureClientExists(name: string, address?: string, email?: string): Promise<Client> {
  const companyId = await getRequiredCompanyId()

  const existing = await db
    .select()
    .from(clients)
    .where(and(eq(clients.companyId, companyId), eq(clients.name, name)))
    .limit(1)

  if (existing.length > 0) {
    const client = existing[0]
    // If email is provided and differs from existing, update it
    if (email && email !== client.email) {
      const [updated] = await db
        .update(clients)
        .set({ email })
        .where(eq(clients.id, client.id))
        .returning()
      revalidatePath('/clients')
      return updated
    }
    return client
  }

  const [created] = await db
    .insert(clients)
    .values({ companyId, name, address: address || null, email: email || null })
    .returning()
  revalidatePath('/clients')
  return created
}

/**
 * Updates a client's fields. Only updates fields that are explicitly provided.
 * Used for inline editing on the clients list page.
 */
export async function updateClient(id: string, input: {
  name?: string
  address?: string
  email?: string
  phone?: string
  accountType?: string
  accountNumber?: string
}): Promise<ActionResult<Client>> {
  const companyId = await getRequiredCompanyId()

  const [row] = await db
    .update(clients)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.address !== undefined && { address: input.address || null }),
      ...(input.email !== undefined && { email: input.email || null }),
      ...(input.phone !== undefined && { phone: input.phone || null }),
      ...(input.accountType !== undefined && { accountType: input.accountType || null }),
      ...(input.accountNumber !== undefined && { accountNumber: input.accountNumber || null }),
    })
    .where(and(eq(clients.companyId, companyId), eq(clients.id, id)))
    .returning()

  if (!row) return { ok: false, error: 'Client not found' }
  revalidatePath('/clients')
  return { ok: true, data: row }
}
