'use server'

import { revalidatePath } from 'next/cache'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clients } from '@/lib/schema'
import { createClientSchema } from '@/lib/validators'
import type { ActionResult, Client } from '@/types'

export async function getClients(): Promise<Client[]> {
  return db.select().from(clients).orderBy(asc(clients.name))
}

export async function createClient(_prev: ActionResult<Client> | null, formData: FormData): Promise<ActionResult<Client>> {
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

  const [client] = await db.insert(clients).values(parsed.data).returning()
  revalidatePath('/clients')
  return { ok: true, data: client }
}

/**
 * Finds a client by name or creates one if no match exists.
 * Used when generating a checkup PDF to persist new customer names.
 */
export async function ensureClientExists(name: string, address?: string): Promise<Client> {
  const existing = await db
    .select()
    .from(clients)
    .where(eq(clients.name, name))
    .limit(1)

  if (existing.length > 0) return existing[0]

  const [created] = await db
    .insert(clients)
    .values({ name, address: address || null })
    .returning()
  revalidatePath('/clients')
  return created
}
