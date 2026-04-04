'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  siteVisits, siteControllers, siteZones, siteBackflows,
  type ZoneIssueData, type QuoteItemData, type ZonePhotoData,
} from '@/lib/schema'
import { saveInspectionSchema } from '@/lib/validators'
import { ensureSiteExists } from '@/actions/sites'
import { ensureClientExists } from '@/actions/clients'
import { getRequiredCompanyId } from '@/lib/tenant'
import type { ActionResult, SiteVisit } from '@/types'
import type { SaveInspectionInput } from '@/lib/validators'

export async function saveInspection(input: SaveInspectionInput): Promise<ActionResult<SiteVisit>> {
  const parsed = saveInspectionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
  }
  const data = parsed.data

  // Resolve companyId once — ensureSiteExists/ensureClientExists also call
  // getRequiredCompanyId internally, but we need it here for the transaction.
  const companyId = await getRequiredCompanyId()

  // Resolve / create site and client outside the transaction
  // (these are idempotent lookups safe to run before the atomic block)
  const site = await ensureSiteExists(data.siteName, data.siteAddress ?? undefined)

  let clientId: string | null = null
  if (data.clientName?.trim()) {
    const client = await ensureClientExists(data.clientName.trim(), data.clientAddress?.trim() ?? undefined, data.clientEmail?.trim() ?? undefined)
    clientId = client.id
  }

  const inspectorId: string | null = data.inspectorId ?? null

  // Atomically sync equipment and upsert the visit
  const visit = await db.transaction(async (tx) => {
    // ── Replace site equipment (full sync from form state) ────────────────

    // Delete zones first (FK → site_controllers)
    await tx.delete(siteZones).where(and(eq(siteZones.companyId, companyId), eq(siteZones.siteId, site.id)))
    await tx.delete(siteControllers).where(and(eq(siteControllers.companyId, companyId), eq(siteControllers.siteId, site.id)))
    await tx.delete(siteBackflows).where(and(eq(siteBackflows.companyId, companyId), eq(siteBackflows.siteId, site.id)))

    // Insert controllers; map ephemeral UI id → new DB id for zone FK resolution
    const controllerIdMap = new Map<string, string>()
    for (const ctrl of data.controllers) {
      const [row] = await tx
        .insert(siteControllers)
        .values({
          companyId,
          siteId:            site.id,
          location:          ctrl.location          || null,
          manufacturer:      ctrl.manufacturer      || null,
          model:             ctrl.model             || null,
          sensors:           ctrl.sensors           || null,
          numZones:          ctrl.numZones,
          masterValve:       ctrl.masterValve,
          masterValveNotes:  ctrl.masterValveNotes  || null,
          notes:             ctrl.notes             || null,
        })
        .returning()
      controllerIdMap.set(String(ctrl.id), row.id)
    }

    for (const zone of data.zones) {
      await tx.insert(siteZones).values({
        companyId,
        siteId:          site.id,
        controllerId:    zone.controller ? (controllerIdMap.get(zone.controller) ?? null) : null,
        zoneNum:         zone.zoneNum,
        description:     zone.description     || null,
        landscapeTypes:  zone.landscapeTypes,
        irrigationTypes: zone.irrigationTypes,
        notes:           zone.notes            || null,
      })
    }

    for (const bf of data.backflows) {
      await tx.insert(siteBackflows).values({
        companyId,
        siteId:       site.id,
        manufacturer: bf.manufacturer || null,
        type:         bf.type         || null,
        model:        bf.model        || null,
        size:         bf.size         || null,
      })
    }

    // ── Build visit snapshot data ─────────────────────────────────────────

    const zoneIssues: ZoneIssueData[] = data.zones.map(z => ({
      zoneNum: z.zoneNum,
      issues:  (data.zoneIssues[z.zoneNum] ?? []) as string[],
    }))

    const zonePhotos: ZonePhotoData[] = data.zones
      .filter(z => z.photoData.length > 0)
      .map(z => ({ zoneNum: z.zoneNum, photos: z.photoData }))

    const quoteItems: QuoteItemData[] = data.quoteItems.map(qi => ({
      id: qi.id, location: qi.location, item: qi.item,
      description: qi.description, price: qi.price, qty: qi.qty,
    }))

    // ── Upsert visit (create or update for same site + date) ──────────────

    const visitData = {
      companyId,
      siteId:      site.id,
      clientId,
      inspectorId,
      datePerformed:       data.datePerformed,
      inspectionType:      data.inspectionType,
      accountType:         data.accountType    || null,
      accountNumber:       data.accountNumber  || null,
      status:              data.status,
      dueDate:             data.dueDate         || null,
      repairEstimate:      data.repairEstimate  || null,
      inspectionNotes:     data.inspectionNotes || null,
      internalNotes:       data.internalNotes  || null,
      staticPressure:      data.staticPressure || null,
      backflowInstalled:   data.backflowInstalled,
      backflowServiceable: data.backflowServiceable,
      isolationValve:      data.isolationValve,
      systemNotes:         data.systemNotes    || null,
      zoneIssues,
      zonePhotos,
      quoteItems,
    }

    const [row] = await tx
      .insert(siteVisits)
      .values(visitData)
      .onConflictDoUpdate({
        target: [siteVisits.siteId, siteVisits.datePerformed],
        set: { ...visitData, updatedAt: new Date() },
      })
      .returning()

    return row
  })

  revalidatePath('/')
  revalidatePath('/inspections')
  return { ok: true, data: visit }
}
