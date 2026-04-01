'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { companySettings } from '@/lib/schema'
import { companySettingsSchema } from '@/lib/validators'
import type { ActionResult, CompanySettings } from '@/types'

const DEFAULTS = {
  id:                  1,
  companyName:         'TM&F Services LLC',
  licenseNum:          'TX LI0028463',
  companyAddress:      '3811 Kentucky ct',
  companyCityStateZip: 'Grand Prairie, TX 75052',
  companyPhone:        '9038122010',
  performedBy:         'Tihomir Tony Alagenchev',
  r2CompanyBucketId:   null,
  updatedAt:           null,
} satisfies CompanySettings

export async function getCompanySettings(): Promise<CompanySettings> {
  const row = await db.query.companySettings.findFirst({
    where: eq(companySettings.id, 1),
  })
  return row ?? DEFAULTS
}

export async function upsertCompanySettings(
  _prev: ActionResult<CompanySettings> | null,
  formData: FormData,
): Promise<ActionResult<CompanySettings>> {
  const raw = {
    companyName:         formData.get('companyName'),
    licenseNum:          formData.get('licenseNum')          || '',
    companyAddress:      formData.get('companyAddress')      || '',
    companyCityStateZip: formData.get('companyCityStateZip') || '',
    companyPhone:        formData.get('companyPhone')        || '',
    performedBy:         formData.get('performedBy')         || '',
    r2CompanyBucketId:   formData.get('r2CompanyBucketId')   || '',
  }

  const parsed = companySettingsSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
  }

  const data = parsed.data
  const [row] = await db
    .insert(companySettings)
    .values({ id: 1, ...data })
    .onConflictDoUpdate({
      target: companySettings.id,
      set: { ...data, updatedAt: new Date() },
    })
    .returning()

  revalidatePath('/')
  revalidatePath('/company')
  return { ok: true, data: row }
}
