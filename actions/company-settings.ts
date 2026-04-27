'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { companySettings } from '@/lib/schema'
import { companySettingsSchema } from '@/lib/validators'
import { getRequiredCompanyId } from '@/lib/tenant'
import type { ActionResult, CompanySettings } from '@/types'

/**
 * Generates a stable, human-readable R2 prefix for a company.
 * Format: {slug}-{first-8-chars-of-uuid}  e.g. "acme-irrigation-a1b2c3d4"
 * The slug is derived from the company name if provided, otherwise falls back
 * to the company UUID alone.
 */
function generateR2BucketId(companyId: string, companyName?: string): string {
  const suffix = companyId.replace(/-/g, '').slice(0, 8)
  if (!companyName) return suffix
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return slug ? `${slug}-${suffix}` : suffix
}

/**
 * Returns the settings row for the current company, auto-creating it with
 * empty defaults on first access so callers always receive a full record.
 * Also auto-heals rows that are missing an r2CompanyBucketId (e.g. rows
 * created before this field was introduced).
 */
export async function getCompanySettings(): Promise<CompanySettings> {
  const companyId = await getRequiredCompanyId()

  const row = await db.query.companySettings.findFirst({
    where: eq(companySettings.companyId, companyId),
  })

  if (row) {
    // Heal missing r2CompanyBucketId for rows created before auto-provisioning
    if (!row.r2CompanyBucketId) {
      const r2CompanyBucketId = generateR2BucketId(companyId, row.companyName || undefined)
      const [healed] = await db
        .update(companySettings)
        .set({ r2CompanyBucketId })
        .where(eq(companySettings.companyId, companyId))
        .returning()
      return healed ?? row
    }
    return row
  }

  // Auto-provision settings for this company on first access.
  const r2CompanyBucketId = generateR2BucketId(companyId)
  const [created] = await db
    .insert(companySettings)
    .values({ companyId, r2CompanyBucketId })
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
