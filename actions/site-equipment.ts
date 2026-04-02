'use server'

import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { siteControllers, siteZones, siteBackflows } from '@/lib/schema'
import {
  createSiteControllerSchema,
  updateSiteControllerSchema,
  createSiteZoneSchema,
  updateSiteZoneSchema,
  createSiteBackflowSchema,
  updateSiteBackflowSchema,
} from '@/lib/validators'
import { getRequiredCompanyId } from '@/lib/tenant'
import type { ActionResult, SiteController, SiteZone, SiteBackflow } from '@/types'

// ── Controllers ───────────────────────────────────────────────────────────

export async function getSiteControllers(siteId: number): Promise<SiteController[]> {
  const companyId = await getRequiredCompanyId()
  return db
    .select()
    .from(siteControllers)
    .where(and(eq(siteControllers.companyId, companyId), eq(siteControllers.siteId, siteId)))
}

export async function createSiteController(input: unknown): Promise<ActionResult<SiteController>> {
  const companyId = await getRequiredCompanyId()
  const parsed = createSiteControllerSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

  const [row] = await db.insert(siteControllers).values({ ...parsed.data, companyId }).returning()
  return { ok: true, data: row }
}

export async function updateSiteController(id: number, input: unknown): Promise<ActionResult<SiteController>> {
  const companyId = await getRequiredCompanyId()
  const parsed = updateSiteControllerSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

  const [row] = await db
    .update(siteControllers)
    .set(parsed.data)
    .where(and(eq(siteControllers.companyId, companyId), eq(siteControllers.id, id)))
    .returning()
  if (!row) return { ok: false, error: 'Controller not found' }
  return { ok: true, data: row }
}

export async function deleteSiteController(id: number): Promise<ActionResult> {
  const companyId = await getRequiredCompanyId()
  await db
    .delete(siteControllers)
    .where(and(eq(siteControllers.companyId, companyId), eq(siteControllers.id, id)))
  return { ok: true, data: undefined }
}

// ── Zones ─────────────────────────────────────────────────────────────────

export async function getSiteZones(siteId: number): Promise<SiteZone[]> {
  const companyId = await getRequiredCompanyId()
  return db
    .select()
    .from(siteZones)
    .where(and(eq(siteZones.companyId, companyId), eq(siteZones.siteId, siteId)))
    .orderBy(siteZones.zoneNum)
}

export async function createSiteZone(input: unknown): Promise<ActionResult<SiteZone>> {
  const companyId = await getRequiredCompanyId()
  const parsed = createSiteZoneSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

  const [row] = await db.insert(siteZones).values({ ...parsed.data, companyId }).returning()
  return { ok: true, data: row }
}

export async function updateSiteZone(id: number, input: unknown): Promise<ActionResult<SiteZone>> {
  const companyId = await getRequiredCompanyId()
  const parsed = updateSiteZoneSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

  const [row] = await db
    .update(siteZones)
    .set(parsed.data)
    .where(and(eq(siteZones.companyId, companyId), eq(siteZones.id, id)))
    .returning()
  if (!row) return { ok: false, error: 'Zone not found' }
  return { ok: true, data: row }
}

export async function deleteSiteZone(id: number): Promise<ActionResult> {
  const companyId = await getRequiredCompanyId()
  await db
    .delete(siteZones)
    .where(and(eq(siteZones.companyId, companyId), eq(siteZones.id, id)))
  return { ok: true, data: undefined }
}

// ── Backflow devices ──────────────────────────────────────────────────────

export async function getSiteBackflows(siteId: number): Promise<SiteBackflow[]> {
  const companyId = await getRequiredCompanyId()
  return db
    .select()
    .from(siteBackflows)
    .where(and(eq(siteBackflows.companyId, companyId), eq(siteBackflows.siteId, siteId)))
}

export async function createSiteBackflow(input: unknown): Promise<ActionResult<SiteBackflow>> {
  const companyId = await getRequiredCompanyId()
  const parsed = createSiteBackflowSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

  const [row] = await db.insert(siteBackflows).values({ ...parsed.data, companyId }).returning()
  return { ok: true, data: row }
}

export async function updateSiteBackflow(id: number, input: unknown): Promise<ActionResult<SiteBackflow>> {
  const companyId = await getRequiredCompanyId()
  const parsed = updateSiteBackflowSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

  const [row] = await db
    .update(siteBackflows)
    .set(parsed.data)
    .where(and(eq(siteBackflows.companyId, companyId), eq(siteBackflows.id, id)))
    .returning()
  if (!row) return { ok: false, error: 'Backflow device not found' }
  return { ok: true, data: row }
}

export async function deleteSiteBackflow(id: number): Promise<ActionResult> {
  const companyId = await getRequiredCompanyId()
  await db
    .delete(siteBackflows)
    .where(and(eq(siteBackflows.companyId, companyId), eq(siteBackflows.id, id)))
  return { ok: true, data: undefined }
}
