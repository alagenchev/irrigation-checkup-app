'use server'
import { getRequiredCompanyId } from '@/lib/tenant'
import { db } from '@/lib/db'
import { siteMaps } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'

export async function getSiteMaps(siteId: string) {
  const companyId = await getRequiredCompanyId()
  return db.query.siteMaps.findMany({
    where: and(eq(siteMaps.siteId, siteId), eq(siteMaps.companyId, companyId)),
    orderBy: (m, { asc }) => asc(m.createdAt),
  })
}

export async function createSiteMap(siteId: string, name: string) {
  const companyId = await getRequiredCompanyId()
  const [map] = await db.insert(siteMaps).values({ siteId, companyId, name }).returning()
  return map
}

export async function saveSiteMapDrawing(mapId: string, drawing: object) {
  const companyId = await getRequiredCompanyId()
  await db.update(siteMaps)
    .set({ drawing, updatedAt: new Date() })
    .where(and(eq(siteMaps.id, mapId), eq(siteMaps.companyId, companyId)))
}

export async function deleteSiteMap(mapId: string) {
  const companyId = await getRequiredCompanyId()
  await db.delete(siteMaps)
    .where(and(eq(siteMaps.id, mapId), eq(siteMaps.companyId, companyId)))
}

export async function duplicateSiteMap(mapId: string, newName: string) {
  const companyId = await getRequiredCompanyId()
  const original = await db.query.siteMaps.findFirst({
    where: and(eq(siteMaps.id, mapId), eq(siteMaps.companyId, companyId)),
  })
  if (!original) throw new Error('Map not found')
  const [copy] = await db.insert(siteMaps)
    .values({
      siteId: original.siteId,
      companyId,
      name: newName,
      drawing: (original.drawing as object | null) ?? undefined,
    })
    .returning()
  return copy
}
