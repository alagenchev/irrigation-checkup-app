'use server'

import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  siteVisits, sites, clients,
  siteControllers, siteZones, siteBackflows,
  type ZoneIssueData, type QuoteItemData, type ZonePhotoData,
} from '@/lib/schema'
import { getRequiredCompanyId } from '@/lib/tenant'
import type {
  IrrigationFormInitialData,
  ControllerFormData, ZoneFormData, BackflowFormData, QuoteItemFormData,
} from '@/types'

export async function getInspectionForEdit(siteVisitId: string): Promise<IrrigationFormInitialData | null> {
  const companyId = await getRequiredCompanyId()

  // Verify the visit belongs to this company before returning any data
  const visit = await db.query.siteVisits.findFirst({
    where: and(eq(siteVisits.companyId, companyId), eq(siteVisits.siteVisitId, siteVisitId)),
  })
  if (!visit) return null

  const [site, client, dbControllers, dbZones, dbBackflows] = await Promise.all([
    db.query.sites.findFirst({
      where: and(eq(sites.companyId, companyId), eq(sites.id, visit.siteId)),
    }),
    visit.clientId
      ? db.query.clients.findFirst({
          where: and(eq(clients.companyId, companyId), eq(clients.id, visit.clientId)),
        })
      : Promise.resolve(null),
    db.select().from(siteControllers)
      .where(and(eq(siteControllers.companyId, companyId), eq(siteControllers.siteId, visit.siteId)))
      .orderBy(siteControllers.id),
    db.select().from(siteZones)
      .where(and(eq(siteZones.companyId, companyId), eq(siteZones.siteId, visit.siteId)))
      .orderBy(siteZones.id),
    db.select().from(siteBackflows)
      .where(and(eq(siteBackflows.companyId, companyId), eq(siteBackflows.siteId, visit.siteId)))
      .orderBy(siteBackflows.id),
  ])

  if (!site) return null

  // Assign stable ephemeral IDs starting at 1 for controller FK resolution
  let eid = 1
  const controllerEphemeralMap = new Map<string, number>()

  const controllers: ControllerFormData[] = dbControllers.map(c => {
    const id = eid++
    controllerEphemeralMap.set(c.id, id)
    return {
      id,
      location:          c.location          ?? '',
      manufacturer:      c.manufacturer      ?? '',
      model:             c.model             ?? '',
      sensors:           c.sensors           ?? '',
      numZones:          c.numZones,
      masterValve:       c.masterValve,
      masterValveNotes:  c.masterValveNotes  ?? '',
      notes:             c.notes             ?? '',
    }
  })

  // Zone photos from visit snapshot
  const zonePhotoMap: Record<string, { url: string; annotation: string }[]> = {}
  if (visit.zonePhotos) {
    for (const zp of visit.zonePhotos as ZonePhotoData[]) {
      zonePhotoMap[zp.zoneNum] = zp.photos
    }
  }

  const zones: ZoneFormData[] = dbZones.map(z => ({
    id:              eid++,
    zoneNum:         z.zoneNum,
    controller:      z.controllerId ? String(controllerEphemeralMap.get(z.controllerId) ?? '') : '',
    description:     z.description     ?? '',
    landscapeTypes:  z.landscapeTypes  ?? [],
    irrigationTypes: z.irrigationTypes ?? [],
    notes:           z.notes           ?? '',
    photoData:       zonePhotoMap[z.zoneNum] ?? [],
  }))

  const backflows: BackflowFormData[] = dbBackflows.map(bf => ({
    id:           eid++,
    manufacturer: bf.manufacturer ?? '',
    type:         bf.type         ?? '',
    model:        bf.model        ?? '',
    size:         bf.size         ?? '',
  }))

  // Zone issues from visit snapshot
  const zoneIssues: Record<string, string[]> = {}
  if (visit.zoneIssues) {
    for (const zi of visit.zoneIssues as ZoneIssueData[]) {
      zoneIssues[zi.zoneNum] = zi.issues
    }
  }

  // Quote items from visit snapshot (default to empty row if none saved)
  const rawQuoteItems = visit.quoteItems as QuoteItemData[] | null
  const quoteItems: QuoteItemFormData[] = rawQuoteItems && rawQuoteItems.length > 0
    ? rawQuoteItems.map(qi => ({
        id:          eid++,
        location:    qi.location,
        item:        qi.item,
        description: qi.description,
        price:       qi.price,
        qty:         qi.qty,
      }))
    : [{ id: eid++, location: '', item: '', description: '', price: '', qty: '1' }]

  return {
    siteVisitId,
    form: {
      clientName:          client?.name          ?? '',
      clientAddress:       client?.address       ?? '',
      siteName:            site.name,
      siteAddress:         site.address          ?? '',
      datePerformed:       visit.datePerformed,
      inspectionType:      visit.inspectionType,
      accountType:         visit.accountType     ?? 'Commercial',
      accountNumber:       visit.accountNumber   ?? '',
      status:              visit.status,
      dueDate:         visit.dueDate         ?? '',
      inspectorId:     visit.inspectorId ?? '',
      repairEstimate:  visit.repairEstimate  ?? '',
      inspectionNotes:     visit.inspectionNotes ?? '',
      internalNotes:       visit.internalNotes   ?? '',
      staticPressure:      visit.staticPressure  ?? '',
      backflowInstalled:   visit.backflowInstalled,
      backflowServiceable: visit.backflowServiceable,
      isolationValve:      visit.isolationValve,
      systemNotes:         visit.systemNotes     ?? '',
    },
    controllers,
    zones,
    backflows,
    zoneIssues,
    quoteItems,
  }
}
