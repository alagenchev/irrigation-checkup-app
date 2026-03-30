'use server'

import { revalidatePath } from 'next/cache'
import { asc } from 'drizzle-orm'
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
