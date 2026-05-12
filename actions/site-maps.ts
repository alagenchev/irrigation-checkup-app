'use server'
import { getRequiredCompanyId } from '@/lib/tenant'
import { db } from '@/lib/db'
import { siteMaps } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'

export async function getSiteMap(mapId: string) {
  const companyId = await getRequiredCompanyId()
  return db.query.siteMaps.findFirst({
    where: and(eq(siteMaps.id, mapId), eq(siteMaps.companyId, companyId)),
  })
}

export async function getSiteMaps(siteId: string) {
  const companyId = await getRequiredCompanyId()
  return db.query.siteMaps.findMany({
    where: and(eq(siteMaps.siteId, siteId), eq(siteMaps.companyId, companyId)),
    orderBy: (m, { asc }) => asc(m.createdAt),
  })
}

export async function createSiteMap(siteId: string, name: string) {
  const companyId = await getRequiredCompanyId()
  try {
    const [map] = await db.insert(siteMaps).values({ siteId, companyId, name }).returning()
    return map
  } catch (err) {
    console.error('[createSiteMap] Failed for siteId', siteId, err)
    throw err
  }
}

export async function saveSiteMapDrawing(mapId: string, drawing: object) {
  const companyId = await getRequiredCompanyId()
  try {
    await db.update(siteMaps)
      .set({ drawing, updatedAt: new Date() })
      .where(and(eq(siteMaps.id, mapId), eq(siteMaps.companyId, companyId)))
  } catch (err) {
    console.error('[saveSiteMapDrawing] Failed for mapId', mapId, err)
    throw err
  }
}

export async function deleteSiteMap(mapId: string) {
  const companyId = await getRequiredCompanyId()
  try {
    await db.delete(siteMaps)
      .where(and(eq(siteMaps.id, mapId), eq(siteMaps.companyId, companyId)))
  } catch (err) {
    console.error('[deleteSiteMap] Failed for mapId', mapId, err)
    throw err
  }
}

export async function duplicateSiteMap(mapId: string, newName: string) {
  const companyId = await getRequiredCompanyId()
  const original = await db.query.siteMaps.findFirst({
    where: and(eq(siteMaps.id, mapId), eq(siteMaps.companyId, companyId)),
  })
  if (!original) {
    console.error('[duplicateSiteMap] Map not found', { mapId, companyId })
    throw new Error('Map not found')
  }
  try {
    const [copy] = await db.insert(siteMaps)
      .values({
        siteId: original.siteId,
        companyId,
        name: newName,
        drawing: (original.drawing as object | null) ?? undefined,
      })
      .returning()
    return copy
  } catch (err) {
    console.error('[duplicateSiteMap] Failed to insert copy for mapId', mapId, err)
    throw err
  }
}
