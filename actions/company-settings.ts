'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { companySettings } from '@/lib/schema'
import { companySettingsSchema } from '@/lib/validators'
import { getRequiredCompanyId } from '@/lib/tenant'
import type { ActionResult, CompanySettings } from '@/types'

/**
 * Returns the settings row for the current company, auto-creating it with
 * empty defaults on first access so callers always receive a full record.
 */
export async function getCompanySettings(): Promise<CompanySettings> {
  const companyId = await getRequiredCompanyId()

  const row = await db.query.companySettings.findFirst({
    where: eq(companySettings.companyId, companyId),
  })
  if (row) return row

  // Auto-provision settings for this company on first access.
  // r2CompanyBucketId is a stable UUID generated once here and never changed.
  const [created] = await db
    .insert(companySettings)
    .values({ companyId, r2CompanyBucketId: crypto.randomUUID() })
    .onConflictDoNothing()
    .returning()

  if (created) return created

  // Race condition: another request created it
  return (await db.query.companySettings.findFirst({
    where: eq(companySettings.companyId, companyId),
  }))!
}

export async function upsertCompanySettings(
  _prev: ActionResult<CompanySettings> | null,
  formData: FormData,
): Promise<ActionResult<CompanySettings>> {
  const companyId = await getRequiredCompanyId()

  const raw = {
    companyName:         formData.get('companyName'),
    licenseNum:          formData.get('licenseNum')          || '',
    companyAddress:      formData.get('companyAddress')      || '',
    companyCityStateZip: formData.get('companyCityStateZip') || '',
    companyPhone:        formData.get('companyPhone')        || '',
    performedBy:         formData.get('performedBy')         || '',
  }

  const parsed = companySettingsSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
  }

  const data = parsed.data
  // r2CompanyBucketId is set once at provisioning time and must never be overwritten here
  const { r2CompanyBucketId: _ignored, ...updateFields } = { r2CompanyBucketId: undefined, ...data }
  const [row] = await db
    .insert(companySettings)
    .values({ companyId, ...data })
    .onConflictDoUpdate({
      target: companySettings.companyId,
      set: { ...updateFields, updatedAt: new Date() },
    })
    .returning()

  revalidatePath('/')
  revalidatePath('/company')
  return { ok: true, data: row }
}
