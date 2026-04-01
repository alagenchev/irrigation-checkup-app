'use server'

import { db } from '@/lib/db'
import { companySettings } from '@/lib/schema'
import { uploadToR2, r2PublicUrl } from '@/lib/r2'
import type { ActionResult } from '@/types'

export type UploadResult = {
  key:       string   // R2 object key — always stored; use for deletion
  publicUrl: string | null  // non-null only when R2_PUBLIC_URL is configured
}

/**
 * Uploads a single zone photo to Cloudflare R2.
 * The file is placed at: {companyBucketId}/zones/{zoneNum}/{timestamp}_{filename}
 *
 * Returns the R2 object key (and a public URL if the bucket is public).
 * Callers should store the key in the zone's photoUrls and persist it with the inspection.
 */
export async function uploadZonePhoto(formData: FormData): Promise<ActionResult<UploadResult>> {
  const file    = formData.get('file') as File | null
  const zoneNum = formData.get('zoneNum') as string | null

  if (!file)    return { ok: false, error: 'No file provided' }
  if (!zoneNum) return { ok: false, error: 'No zone number provided' }

  const settings = await db.query.companySettings.findFirst()
  if (!settings?.r2CompanyBucketId?.trim()) {
    return {
      ok: false,
      error: 'R2 Company Bucket ID is not set. Add it in Company Settings.',
    }
  }

  const buffer    = Buffer.from(await file.arrayBuffer())
  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path      = `zones/${zoneNum}/${Date.now()}_${safeName}`

  try {
    const key = await uploadToR2(settings.r2CompanyBucketId, path, buffer, file.type || 'application/octet-stream')
    return { ok: true, data: { key, publicUrl: r2PublicUrl(key) } }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return { ok: false, error: message }
  }
}
