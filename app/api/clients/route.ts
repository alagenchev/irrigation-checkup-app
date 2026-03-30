import { NextRequest, NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clients } from '@/lib/schema'
import { createClientSchema } from '@/lib/validators'

export async function GET() {
  try {
    const rows = await db.select().from(clients).orderBy(asc(clients.name))
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
    const body = await req.json()
    const parsed = createClientSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
    }
    const [client] = await db.insert(clients).values(parsed.data).returning()
    return NextResponse.json(client, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
