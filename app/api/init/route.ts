import { NextResponse } from 'next/server'
import { initDb } from '@/lib/db'

/**
 * POST /api/init - Runs database migrations (CREATE TABLE IF NOT EXISTS)
 *
 * Use this endpoint to explicitly trigger schema initialization during deployment.
 * Can be called multiple times safely — idempotent via CREATE TABLE IF NOT EXISTS.
 *
 * Example:
 *   curl -X POST https://your-app.railway.app/api/init
 */
export async function POST() {
  try {
    await initDb()
    return NextResponse.json({ success: true, message: 'Database initialized' }, { status: 200 })
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
