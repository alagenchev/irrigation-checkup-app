'use server'

import { revalidatePath } from 'next/cache'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { inspectors } from '@/lib/schema'
import { createInspectorSchema, updateInspectorSchema } from '@/lib/validators'
import { getRequiredCompanyId } from '@/lib/tenant'
import type { ActionResult, Inspector } from '@/types'
import type { CreateInspectorInput, UpdateInspectorInput } from '@/lib/validators'

export async function getInspectors(): Promise<Inspector[]> {
  const companyId = await getRequiredCompanyId()
  return db
    .select()
    .from(inspectors)
    .where(eq(inspectors.companyId, companyId))
    .orderBy(asc(inspectors.lastName), asc(inspectors.firstName))
}

export async function createInspector(input: CreateInspectorInput): Promise<ActionResult<Inspector>> {
  const companyId = await getRequiredCompanyId()

  const parsed = createInspectorSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
  }
  const data = parsed.data
  const [row] = await db.insert(inspectors).values({
    companyId,
    firstName:  data.firstName,
    lastName:   data.lastName,
    email:      data.email      || null,
    phone:      data.phone      || null,
    licenseNum: data.licenseNum || null,
  }).returning()
  revalidatePath('/inspectors')
  return { ok: true, data: row }
}

export async function updateInspector(id: string, input: UpdateInspectorInput): Promise<ActionResult<Inspector>> {
  const companyId = await getRequiredCompanyId()

  const parsed = updateInspectorSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
  }
  const data = parsed.data
  const [row] = await db.update(inspectors)
    .set({
      ...(data.firstName  !== undefined && { firstName: data.firstName }),
      ...(data.lastName   !== undefined && { lastName:  data.lastName }),
      ...(data.email      !== undefined && { email:     data.email     || null }),
      ...(data.phone      !== undefined && { phone:     data.phone     || null }),
      ...(data.licenseNum !== undefined && { licenseNum: data.licenseNum || null }),
    })
    .where(and(eq(inspectors.companyId, companyId), eq(inspectors.id, id)))
    .returning()
  if (!row) return { ok: false, error: 'Inspector not found' }
  revalidatePath('/inspectors')
  return { ok: true, data: row }
}
