import { NextRequest, NextResponse } from 'next/server'
import { pool, initDb } from '@/lib/db'

export async function GET() {
  try {
    await initDb()
    const result = await pool.query('SELECT * FROM clients ORDER BY name ASC')
    return NextResponse.json(result.rows)
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb()
    const { name, address, phone, email, account_type, account_number } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    const result = await pool.query(
      `INSERT INTO clients (name, address, phone, email, account_type, account_number)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, address, phone, email, account_type, account_number]
    )
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}
