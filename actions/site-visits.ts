'use server'

import { and, count, desc, eq, lt, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clients, inspectors, siteVisits, sites, type ZoneIssueData, type QuoteItemData } from '@/lib/schema'
import { createSiteVisitSchema } from '@/lib/validators'
import type { ActionResult, SiteVisit } from '@/types'
import type { CreateSiteVisitInput } from '@/lib/validators'

const INSPECTIONS_PAGE_SIZE = 10

type InspectionRow = {
  siteVisitId:    number
  datePerformed:  string
  inspectionType: string
  status:         string
  siteName:       string
  clientName:     string | null
  inspectorName:  string | null
}

export async function getInspections(page: number): Promise<{ rows: InspectionRow[]; total: number; pageSize: number }> {
  const offset = (page - 1) * INSPECTIONS_PAGE_SIZE

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        siteVisitId:    siteVisits.siteVisitId,
        datePerformed:  siteVisits.datePerformed,
        inspectionType: siteVisits.inspectionType,
        status:         siteVisits.status,
        siteName:      sites.name,
        clientName:    clients.name,
        inspectorName: sql<string | null>`nullif(concat(${inspectors.firstName}, ' ', ${inspectors.lastName}), ' ')`,
      })
      .from(siteVisits)
      .leftJoin(sites,       eq(siteVisits.siteId,       sites.id))
      .leftJoin(clients,     eq(siteVisits.clientId,     clients.id))
      .leftJoin(inspectors,  eq(siteVisits.inspectorId,  inspectors.id))
      .orderBy(desc(siteVisits.datePerformed))
      .limit(INSPECTIONS_PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(siteVisits),
  ])

  return { rows: rows as InspectionRow[], total, pageSize: INSPECTIONS_PAGE_SIZE }
}

export async function getSiteVisitsForSite(siteId: number): Promise<SiteVisit[]> {
  return db
    .select()
    .from(siteVisits)
    .where(eq(siteVisits.siteId, siteId))
    .orderBy(desc(siteVisits.datePerformed))
}

/**
 * Returns the most recent visit's system overview snapshot for a site.
 * Used to pre-populate new visits with existing system state.
 */
export async function getLatestSystemDataForSite(siteId: number) {
  return db.query.siteVisits.findFirst({
    where: eq(siteVisits.siteId, siteId),
    orderBy: [desc(siteVisits.datePerformed)],
    columns: {
      staticPressure:      true,
      backflowInstalled:   true,
      backflowServiceable: true,
      isolationValve:      true,
      systemNotes:         true,
    },
  }) ?? null
}

/**
 * Creates a site visit.
 *
 * Irrigation system overview fields (staticPressure, backflowInstalled,
 * backflowServiceable, isolationValve, systemNotes) are auto-populated from
 * the most recent prior visit for the same site when not explicitly provided.
 *
 * Controllers, zones, and backflow devices are site-level records in their
 * own tables — not stored per-visit.
 *
 * Per-visit snapshot data (zoneIssues, quoteItems) is never
 * auto-populated.
 */
export async function createSiteVisit(input: CreateSiteVisitInput): Promise<ActionResult<SiteVisit>> {
  const parsed = createSiteVisitSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
  }

  const data = parsed.data

  // Fetch most recent prior visit for system overview auto-population
  const priorVisit = await db.query.siteVisits.findFirst({
    where: and(
      eq(siteVisits.siteId, data.siteId),
      lt(siteVisits.datePerformed, data.datePerformed),
    ),
    orderBy: [desc(siteVisits.datePerformed)],
    columns: {
      staticPressure:      true,
      backflowInstalled:   true,
      backflowServiceable: true,
      isolationValve:      true,
      systemNotes:         true,
    },
  })

  // Casting via unknown: arrays pass Zod as unknown[], stored shape is typed
  // by the application layer. This is intentional for JSONB snapshot columns.
  const snap = <T>(v: unknown[] | undefined | null) => (v ?? null) as T | null

  const [visit] = await db
    .insert(siteVisits)
    .values({
      siteId:      data.siteId,
      clientId:    data.clientId    ?? null,
      inspectorId: data.inspectorId ?? null,

      datePerformed:   data.datePerformed,
      inspectionType:  data.inspectionType,
      accountType:     data.accountType    ?? null,
      accountNumber:   data.accountNumber  ?? null,
      status:          data.status,
      dueDate:         data.dueDate         ?? null,
      repairEstimate:  data.repairEstimate  ?? null,
      inspectionNotes: data.inspectionNotes ?? null,
      internalNotes:   data.internalNotes   ?? null,

      // System overview: caller → prior visit → schema default
      staticPressure:      data.staticPressure      ?? priorVisit?.staticPressure      ?? null,
      backflowInstalled:   data.backflowInstalled   ?? priorVisit?.backflowInstalled   ?? false,
      backflowServiceable: data.backflowServiceable ?? priorVisit?.backflowServiceable ?? false,
      isolationValve:      data.isolationValve      ?? priorVisit?.isolationValve      ?? false,
      systemNotes:         data.systemNotes         ?? priorVisit?.systemNotes         ?? null,

      // Visit-specific snapshot data
      zoneIssues: snap<ZoneIssueData[]>(data.zoneIssues ?? null),
      quoteItems: snap<QuoteItemData[]>(data.quoteItems ?? null),
    })
    .returning()

  return { ok: true, data: visit }
}
