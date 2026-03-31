'use server'

import { eq } from 'drizzle-orm'
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
import type { ActionResult, SiteController, SiteZone, SiteBackflow } from '@/types'

// ── Controllers ───────────────────────────────────────────────────────────

export async function getSiteControllers(siteId: number): Promise<SiteController[]> {
  return db.select().from(siteControllers).where(eq(siteControllers.siteId, siteId))
}

export async function createSiteController(input: unknown): Promise<ActionResult<SiteController>> {
  const parsed = createSiteControllerSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

  const [row] = await db.insert(siteControllers).values(parsed.data).returning()
  return { ok: true, data: row }
}

export async function updateSiteController(id: number, input: unknown): Promise<ActionResult<SiteController>> {
  const parsed = updateSiteControllerSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

  const [row] = await db
    .update(siteControllers)
    .set(parsed.data)
    .where(eq(siteControllers.id, id))
    .returning()
  if (!row) return { ok: false, error: 'Controller not found' }
  return { ok: true, data: row }
}

export async function deleteSiteController(id: number): Promise<ActionResult> {
  await db.delete(siteControllers).where(eq(siteControllers.id, id))
  return { ok: true, data: undefined }
}

// ── Zones ─────────────────────────────────────────────────────────────────

export async function getSiteZones(siteId: number): Promise<SiteZone[]> {
  return db
    .select()
    .from(siteZones)
    .where(eq(siteZones.siteId, siteId))
    .orderBy(siteZones.zoneNum)
}

export async function createSiteZone(input: unknown): Promise<ActionResult<SiteZone>> {
  const parsed = createSiteZoneSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

  const [row] = await db.insert(siteZones).values(parsed.data).returning()
  return { ok: true, data: row }
}

export async function updateSiteZone(id: number, input: unknown): Promise<ActionResult<SiteZone>> {
  const parsed = updateSiteZoneSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

  const [row] = await db
    .update(siteZones)
    .set(parsed.data)
    .where(eq(siteZones.id, id))
    .returning()
  if (!row) return { ok: false, error: 'Zone not found' }
  return { ok: true, data: row }
}

export async function deleteSiteZone(id: number): Promise<ActionResult> {
  await db.delete(siteZones).where(eq(siteZones.id, id))
  return { ok: true, data: undefined }
}

// ── Backflow devices ──────────────────────────────────────────────────────

export async function getSiteBackflows(siteId: number): Promise<SiteBackflow[]> {
  return db.select().from(siteBackflows).where(eq(siteBackflows.siteId, siteId))
}

export async function createSiteBackflow(input: unknown): Promise<ActionResult<SiteBackflow>> {
  const parsed = createSiteBackflowSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

  const [row] = await db.insert(siteBackflows).values(parsed.data).returning()
  return { ok: true, data: row }
}

export async function updateSiteBackflow(id: number, input: unknown): Promise<ActionResult<SiteBackflow>> {
  const parsed = updateSiteBackflowSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

  const [row] = await db
    .update(siteBackflows)
    .set(parsed.data)
    .where(eq(siteBackflows.id, id))
    .returning()
  if (!row) return { ok: false, error: 'Backflow device not found' }
  return { ok: true, data: row }
}

export async function deleteSiteBackflow(id: number): Promise<ActionResult> {
  await db.delete(siteBackflows).where(eq(siteBackflows.id, id))
  return { ok: true, data: undefined }
}
