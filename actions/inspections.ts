'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  siteVisits, sites, clients, technicians,
  siteControllers, siteZones, siteBackflows,
  type ZoneIssueData, type QuoteItemData,
} from '@/lib/schema'
import type {
  IrrigationFormInitialData,
  ControllerFormData, ZoneFormData, BackflowFormData, QuoteItemFormData,
} from '@/types'

export async function getInspectionForEdit(siteVisitId: number): Promise<IrrigationFormInitialData | null> {
  const visit = await db.query.siteVisits.findFirst({
    where: eq(siteVisits.siteVisitId, siteVisitId),
  })
  if (!visit) return null

  const [site, client, technician, dbControllers, dbZones, dbBackflows] = await Promise.all([
    db.query.sites.findFirst({ where: eq(sites.id, visit.siteId) }),
    visit.clientId
      ? db.query.clients.findFirst({ where: eq(clients.id, visit.clientId) })
      : Promise.resolve(null),
    visit.technicianId
      ? db.query.technicians.findFirst({ where: eq(technicians.id, visit.technicianId) })
      : Promise.resolve(null),
    db.select().from(siteControllers).where(eq(siteControllers.siteId, visit.siteId)).orderBy(siteControllers.id),
    db.select().from(siteZones).where(eq(siteZones.siteId, visit.siteId)).orderBy(siteZones.id),
    db.select().from(siteBackflows).where(eq(siteBackflows.siteId, visit.siteId)).orderBy(siteBackflows.id),
  ])

  if (!site) return null

  // Assign stable ephemeral IDs starting at 1 for controller FK resolution
  let eid = 1
  const controllerEphemeralMap = new Map<number, number>()

  const controllers: ControllerFormData[] = dbControllers.map(c => {
    const id = eid++
    controllerEphemeralMap.set(c.id, id)
    return {
      id,
      location:     c.location     ?? '',
      manufacturer: c.manufacturer ?? '',
      model:        c.model        ?? '',
      sensors:      c.sensors      ?? '',
      numZones:     c.numZones,
      masterValve:  c.masterValve,
      notes:        c.notes        ?? '',
    }
  })

  const zones: ZoneFormData[] = dbZones.map(z => ({
    id:              eid++,
    zoneNum:         z.zoneNum,
    controller:      z.controllerId ? String(controllerEphemeralMap.get(z.controllerId) ?? '') : '',
    description:     z.description     ?? '',
    landscapeTypes:  z.landscapeTypes  ?? [],
    irrigationTypes: z.irrigationTypes ?? [],
    notes:           z.notes           ?? '',
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
      dueDate:             visit.dueDate         ?? '',
      assignedTechnician:  technician?.name      ?? '',
      repairEstimate:      visit.repairEstimate  ?? '',
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
