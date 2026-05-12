import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

/**
 * POST /api/init — database connectivity health check.
 * Migrations are handled by drizzle-kit (see scripts/migrate.ts and Dockerfile).
 */
export async function POST() {
  try {
    await db.execute(sql`SELECT 1`)
    return NextResponse.json({ success: true, message: 'Database connection OK' })
  } catch (err: unknown) {
    console.error('[/api/init] Database connectivity check failed', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
