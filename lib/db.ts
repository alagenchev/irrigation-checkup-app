import { Pool } from 'pg'

const globalForPg = globalThis as unknown as { pgPool: Pool }

export const pool = globalForPg.pgPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
})

if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = pool

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id        SERIAL PRIMARY KEY,
      name      TEXT NOT NULL,
      address   TEXT,
      phone     TEXT,
      email     TEXT,
      account_type   TEXT,
      account_number TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}
