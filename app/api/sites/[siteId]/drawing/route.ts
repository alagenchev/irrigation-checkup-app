import { NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sites, siteDrawings } from '@/lib/schema'
import { getRequiredCompanyId } from '@/lib/tenant'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const companyId = await getRequiredCompanyId()
  const { siteId } = await params

  const site = await db.query.sites.findFirst({
    where: and(eq(sites.id, siteId), eq(sites.companyId, companyId)),
    columns: { id: true },
  })
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const row = await db.query.siteDrawings.findFirst({
    where: and(eq(siteDrawings.siteId, siteId), eq(siteDrawings.companyId, companyId)),
    columns: { drawing: true },
  })

  return NextResponse.json({ drawing: row?.drawing ?? null })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const companyId = await getRequiredCompanyId()
  const { siteId } = await params

  const site = await db.query.sites.findFirst({
    where: and(eq(sites.id, siteId), eq(sites.companyId, companyId)),
    columns: { id: true },
  })
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let drawing: unknown
  try {
    drawing = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (
    typeof drawing !== 'object' ||
    drawing === null ||
    (drawing as Record<string, unknown>).type !== 'FeatureCollection'
  ) {
    return NextResponse.json({ error: 'Expected a GeoJSON FeatureCollection' }, { status: 400 })
  }

  await db
    .insert(siteDrawings)
    .values({ companyId, siteId, drawing })
    .onConflictDoUpdate({
      target: siteDrawings.siteId,
      set: { drawing, updatedAt: new Date() },
    })

  return NextResponse.json({ ok: true })
}
