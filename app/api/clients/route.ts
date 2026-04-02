import { NextRequest, NextResponse } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clients } from '@/lib/schema'
import { createClientSchema } from '@/lib/validators'
import { getRequiredCompanyId } from '@/lib/tenant'

export async function GET() {
  try {
    const companyId = await getRequiredCompanyId()
    const rows = await db
      .select()
      .from(clients)
      .where(eq(clients.companyId, companyId))
      .orderBy(asc(clients.name))
    return NextResponse.json(rows)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getRequiredCompanyId()
    const body = await req.json()
    const parsed = createClientSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
    }
    const [client] = await db
      .insert(clients)
      .values({ ...parsed.data, companyId })
      .returning()
    return NextResponse.json(client, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
