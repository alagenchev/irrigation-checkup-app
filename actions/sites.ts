'use server'

import { revalidatePath } from 'next/cache'
import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clients, sites, siteControllers, siteZones, siteBackflows, siteVisits } from '@/lib/schema'
import { createSiteSchema, updateSiteEquipmentSchema } from '@/lib/validators'
import { getRequiredCompanyId } from '@/lib/tenant'
import type { ActionResult, Site, ControllerFormData, ZoneFormData, BackflowFormData } from '@/types'
import type { UpdateSiteEquipmentInput } from '@/lib/validators'

export type SiteWithClient = Site & {
  clientName:          string | null
  clientAddress:       string | null
  clientPhone:         string | null
  clientEmail:         string | null
  clientAccountType:   string | null
  clientAccountNumber: string | null
}

export async function getSites(): Promise<SiteWithClient[]> {
  const companyId = await getRequiredCompanyId()
  const rows = await db
    .select({
      id:            sites.id,
      companyId:     sites.companyId,
      name:          sites.name,
      address:       sites.address,
      clientId:      sites.clientId,
      notes:         sites.notes,
      createdAt:     sites.createdAt,
      clientName:          clients.name,
      clientAddress:       clients.address,
      clientPhone:         clients.phone,
      clientEmail:         clients.email,
      clientAccountType:   clients.accountType,
      clientAccountNumber: clients.accountNumber,
    })
    .from(sites)
    .leftJoin(clients, eq(sites.clientId, clients.id))
    .where(eq(sites.companyId, companyId))
    .orderBy(asc(sites.name))
  return rows
}

/**
 * Creates a site. If clientName is provided and matches an existing client
 * within the same company, links to that client. If clientName is new,
 * creates the client first.
 */
export async function createSite(_prev: ActionResult<Site> | null, formData: FormData): Promise<ActionResult<Site>> {
  const companyId = await getRequiredCompanyId()

  const raw = {
    name:                formData.get('name'),
    address:             formData.get('address')               || undefined,
    clientName:          formData.get('client_name')           || undefined,
    clientAddress:       formData.get('client_address')        || undefined,
    clientPhone:         formData.get('client_phone')          || undefined,
    clientEmail:         formData.get('client_email')          || undefined,
    clientAccountType:   formData.get('client_account_type')   || undefined,
    clientAccountNumber: formData.get('client_account_number') || undefined,
    notes:               formData.get('notes')                 || undefined,
  }

  const parsed = createSiteSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
  }

  const { name, address, clientName, clientAddress, clientPhone, clientEmail, clientAccountType, clientAccountNumber, notes } = parsed.data

  let clientId: string | null = null
  if (clientName) {
    const existing = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.companyId, companyId), eq(clients.name, clientName)))
      .limit(1)

    if (existing.length > 0) {
      clientId = existing[0].id
    } else {
      const [newClient] = await db
        .insert(clients)
        .values({
          companyId,
          name:          clientName,
          address:       clientAddress,
          phone:         clientPhone,
          email:         clientEmail || undefined,
          accountType:   clientAccountType,
          accountNumber: clientAccountNumber,
        })
        .returning({ id: clients.id })
      clientId = newClient.id
    }
  }

  const [site] = await db.insert(sites).values({ companyId, name, address, clientId, notes }).returning()
  revalidatePath('/sites')
  return { ok: true, data: site }
}

/**
 * Pure core logic for updating site equipment — accepts injected DB for testability.
 * Runs a delete-then-insert transaction for all three equipment tables.
 */
async function updateSiteEquipmentCore(
  input: UpdateSiteEquipmentInput,
  companyId: string,
  dbClient: typeof db,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { siteId, controllers, zones, backflows, overview } = input

  // Verify the site belongs to this company before mutating equipment
  const siteRow = await dbClient
    .select({ id: sites.id })
    .from(sites)
    .where(and(eq(sites.companyId, companyId), eq(sites.id, siteId)))
    .limit(1)

  if (siteRow.length === 0) {
    return { ok: false, error: 'Site not found' }
  }

  await dbClient.transaction(async (tx) => {
    // Delete zones first (FK → site_controllers)
    await tx.delete(siteZones).where(and(eq(siteZones.companyId, companyId), eq(siteZones.siteId, siteId)))
    await tx.delete(siteControllers).where(and(eq(siteControllers.companyId, companyId), eq(siteControllers.siteId, siteId)))
    await tx.delete(siteBackflows).where(and(eq(siteBackflows.companyId, companyId), eq(siteBackflows.siteId, siteId)))

    // Insert controllers; map ephemeral UI id → new DB uuid for zone FK resolution
    const controllerIdMap = new Map<string, string>()
    for (const ctrl of controllers) {
      const [row] = await tx
        .insert(siteControllers)
        .values({
          companyId,
          siteId,
          location:         ctrl.location         || null,
          manufacturer:     ctrl.manufacturer     || null,
          model:            ctrl.model            || null,
          sensors:          ctrl.sensors          || null,
          numZones:         ctrl.numZones,
          masterValve:      ctrl.masterValve,
          masterValveNotes: ctrl.masterValveNotes || null,
          notes:            ctrl.notes            || null,
        })
        .returning()
      controllerIdMap.set(String(ctrl.id), row.id)
    }

    for (const zone of zones) {
      await tx.insert(siteZones).values({
        companyId,
        siteId,
        controllerId:    zone.controller ? (controllerIdMap.get(zone.controller) ?? null) : null,
        zoneNum:         zone.zoneNum,
        description:     zone.description     || null,
        landscapeTypes:  zone.landscapeTypes,
        irrigationTypes: zone.irrigationTypes,
        notes:           zone.notes           || null,
      })
    }

    for (const bf of backflows) {
      await tx.insert(siteBackflows).values({
        companyId,
        siteId,
        manufacturer: bf.manufacturer || null,
        type:         bf.type         || null,
        model:        bf.model        || null,
        size:         bf.size         || null,
      })
    }

    // If overview data is provided, upsert it into the most recent site visit,
    // or create a new visit record with today's date as a system-overview-only entry.
    if (overview) {
      const today = new Date().toISOString().slice(0, 10)
      const overviewData = {
        companyId,
        siteId,
        datePerformed:       today,
        staticPressure:      overview.staticPressure      || null,
        backflowInstalled:   overview.backflowInstalled,
        backflowServiceable: overview.backflowServiceable,
        isolationValve:      overview.isolationValve,
        systemNotes:         overview.systemNotes          || null,
      }
      await tx
        .insert(siteVisits)
        .values(overviewData)
        .onConflictDoUpdate({
          target: [siteVisits.siteId, siteVisits.datePerformed],
          set: {
            staticPressure:      overviewData.staticPressure,
            backflowInstalled:   overviewData.backflowInstalled,
            backflowServiceable: overviewData.backflowServiceable,
            isolationValve:      overviewData.isolationValve,
            systemNotes:         overviewData.systemNotes,
            updatedAt:           new Date(),
          },
        })
    }
  })

  revalidatePath('/sites')
  return { ok: true }
}

/**
 * Server Action: update all equipment (controllers/zones/backflows) for a site.
 * Validates the site belongs to the caller's company, then replaces equipment in
 * a single transaction (delete-then-insert).
 */
export async function updateSiteEquipment(
  input: UpdateSiteEquipmentInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const companyId = await getRequiredCompanyId()

  const parsed = updateSiteEquipmentSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
  }

  try {
    return await updateSiteEquipmentCore(parsed.data, companyId, db)
  } catch {
    return { ok: false, error: 'Failed to update equipment. Please try again.' }
  }
}

/**
 * Finds a site by name within the current company or creates one if no match exists.
 * Used by saveInspection to resolve a typed site name to a DB id.
 */
export async function ensureSiteExists(name: string, address?: string): Promise<Site> {
  const companyId = await getRequiredCompanyId()
  const existing = await db
    .select()
    .from(sites)
    .where(and(eq(sites.companyId, companyId), eq(sites.name, name)))
    .limit(1)
  if (existing.length > 0) return existing[0]
  const [created] = await db.insert(sites).values({ companyId, name, address: address ?? null }).returning()
  revalidatePath('/sites')
  return created
}

// ── Site Equipment ────────────────────────────────────────────────────────────

export type SiteEquipment = {
  controllers: ControllerFormData[]
  zones: ZoneFormData[]
  backflows: BackflowFormData[]
  overview: {
    staticPressure: string
    backflowInstalled: boolean
    backflowServiceable: boolean
    isolationValve: boolean
    systemNotes: string
  } | null
}

/**
 * Pure core logic for reading site equipment — accepts injected DB for testability.
 * Fetches controllers, zones, backflows, and latest visit overview for the given site.
 */
export async function findSiteEquipment(
  siteId: string,
  companyId: string,
  dbClient: typeof db,
): Promise<SiteEquipment> {
  // Verify the site belongs to this company before returning any data
  const siteRow = await dbClient
    .select({ id: sites.id })
    .from(sites)
    .where(and(eq(sites.companyId, companyId), eq(sites.id, siteId)))
    .limit(1)

  if (siteRow.length === 0) {
    throw new Error('Site not found')
  }

  const [dbControllers, dbZones, dbBackflows, latestVisit] = await Promise.all([
    dbClient
      .select()
      .from(siteControllers)
      .where(and(eq(siteControllers.companyId, companyId), eq(siteControllers.siteId, siteId)))
      .orderBy(asc(siteControllers.id)),
    dbClient
      .select()
      .from(siteZones)
      .where(and(eq(siteZones.companyId, companyId), eq(siteZones.siteId, siteId)))
      .orderBy(asc(siteZones.id)),
    dbClient
      .select()
      .from(siteBackflows)
      .where(and(eq(siteBackflows.companyId, companyId), eq(siteBackflows.siteId, siteId)))
      .orderBy(asc(siteBackflows.id)),
    dbClient
      .select({
        staticPressure:      siteVisits.staticPressure,
        backflowInstalled:   siteVisits.backflowInstalled,
        backflowServiceable: siteVisits.backflowServiceable,
        isolationValve:      siteVisits.isolationValve,
        systemNotes:         siteVisits.systemNotes,
      })
      .from(siteVisits)
      .where(and(eq(siteVisits.companyId, companyId), eq(siteVisits.siteId, siteId)))
      .orderBy(desc(siteVisits.createdAt))
      .limit(1),
  ])

  // Assign stable ephemeral IDs starting at 1 for controller FK resolution in UI
  let eid = 1
  const controllerEphemeralMap = new Map<string, number>()

  const controllers: ControllerFormData[] = dbControllers.map(c => {
    const id = eid++
    controllerEphemeralMap.set(c.id, id)
    return {
      id,
      location:         c.location         ?? '',
      manufacturer:     c.manufacturer     ?? '',
      model:            c.model            ?? '',
      sensors:          c.sensors          ?? '',
      numZones:         c.numZones,
      masterValve:      c.masterValve,
      masterValveNotes: c.masterValveNotes ?? '',
      notes:            c.notes            ?? '',
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
    photoData:       [],
  }))

  const backflows: BackflowFormData[] = dbBackflows.map(bf => ({
    id:           eid++,
    manufacturer: bf.manufacturer ?? '',
    type:         bf.type         ?? '',
    model:        bf.model        ?? '',
    size:         bf.size         ?? '',
  }))

  const visit = latestVisit[0] ?? null
  const overview = visit
    ? {
        staticPressure:      visit.staticPressure      ?? '',
        backflowInstalled:   visit.backflowInstalled,
        backflowServiceable: visit.backflowServiceable,
        isolationValve:      visit.isolationValve,
        systemNotes:         visit.systemNotes          ?? '',
      }
    : null

  return { controllers, zones, backflows, overview }
}

/**
 * Server Action: fetch all equipment (controllers/zones/backflows) and latest
 * system overview for a given site.
 */
export async function getSiteEquipment(siteId: string): Promise<SiteEquipment> {
  const companyId = await getRequiredCompanyId()
  return findSiteEquipment(siteId, companyId, db)
}
