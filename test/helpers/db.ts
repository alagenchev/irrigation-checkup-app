import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { Pool, PoolClient } from 'pg'

let container: StartedPostgreSqlContainer
let pool: Pool

/**
 * Starts a Postgres testcontainer and runs migrations.
 * Uses DATABASE_URL_TEST if set (local DB), otherwise spins up a container.
 * Call in beforeAll() with a generous timeout (60s).
 *
 * Requires DOCKER_HOST to be set correctly before this is called.
 * The npm test:db script handles this automatically via `docker context inspect`.
 */
export async function startTestDb(): Promise<void> {
  let connectionString = process.env.DATABASE_URL_TEST

  if (!connectionString) {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    connectionString = container.getConnectionUri()
  }

  pool = new Pool({ connectionString })
  await runMigrations(pool)
}

/** Stops the pool and container (if one was started). Call in afterAll(). */
export async function stopTestDb(): Promise<void> {
  await pool?.end()
  await container?.stop()
}

/**
 * Wraps a test in a transaction that is always rolled back.
 * Guarantees no data leaks between tests.
 */
export async function withRollback(fn: (client: PoolClient) => Promise<void>): Promise<void> {
  const client = await pool.connect()
  await client.query('BEGIN')
  try {
    await fn(client)
  } finally {
    await client.query('ROLLBACK')
    client.release()
  }
}

/** Returns the raw pool — useful for assertions outside a transaction. */
export function getTestPool(): Pool {
  return pool
}

async function runMigrations(p: Pool): Promise<void> {
  await p.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id             SERIAL PRIMARY KEY,
      name           TEXT NOT NULL,
      address        TEXT,
      phone          TEXT,
      email          TEXT,
      account_type   TEXT,
      account_number TEXT,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}
