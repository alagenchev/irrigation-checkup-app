'use server'

import { and, desc, eq, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { siteVisits, type ZoneIssueData, type ZoneNoteData, type QuoteItemData } from '@/lib/schema'
import { createSiteVisitSchema } from '@/lib/validators'
import type { ActionResult, SiteVisit } from '@/types'
import type { CreateSiteVisitInput } from '@/lib/validators'

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
 * Per-visit snapshot data (zoneIssues, zoneNotes, quoteItems) is never
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
      siteId:       data.siteId,
      clientId:     data.clientId     ?? null,
      technicianId: data.technicianId ?? null,

      datePerformed:  data.datePerformed,
      checkupType:    data.checkupType,
      accountType:    data.accountType   ?? null,
      accountNumber:  data.accountNumber ?? null,
      status:         data.status,
      dueDate:        data.dueDate        ?? null,
      repairEstimate: data.repairEstimate ?? null,
      checkupNotes:   data.checkupNotes   ?? null,
      internalNotes:  data.internalNotes  ?? null,

      // System overview: caller → prior visit → schema default
      staticPressure:      data.staticPressure      ?? priorVisit?.staticPressure      ?? null,
      backflowInstalled:   data.backflowInstalled   ?? priorVisit?.backflowInstalled   ?? false,
      backflowServiceable: data.backflowServiceable ?? priorVisit?.backflowServiceable ?? false,
      isolationValve:      data.isolationValve      ?? priorVisit?.isolationValve      ?? false,
      systemNotes:         data.systemNotes         ?? priorVisit?.systemNotes         ?? null,

      // Visit-specific snapshot data
      zoneIssues: snap<ZoneIssueData[]>(data.zoneIssues ?? null),
      zoneNotes:  snap<ZoneNoteData[]>(data.zoneNotes   ?? null),
      quoteItems: snap<QuoteItemData[]>(data.quoteItems ?? null),
    })
    .returning()

  return { ok: true, data: visit }
}
