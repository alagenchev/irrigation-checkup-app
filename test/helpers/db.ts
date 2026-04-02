import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import postgres, { type Sql, type TransactionSql } from 'postgres'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { eq } from 'drizzle-orm'
import * as schema from '@/lib/schema'

let container: StartedPostgreSqlContainer | undefined
let sql: Sql
export let testDb: PostgresJsDatabase<typeof schema>

/** Stable company ID used across all integration tests. Set by startTestDb(). */
export let TEST_COMPANY_ID: number

const TEST_CLERK_ORG_ID = 'org_test_integration'

class RollbackSignal extends Error {}

/**
 * Starts a Postgres testcontainer and runs migrations.
 * Uses DATABASE_URL_TEST if set (local DB), otherwise spins up a container.
 * Call in beforeAll() with a generous timeout (60s).
 */
export async function startTestDb(): Promise<void> {
  let connectionString = process.env.DATABASE_URL_TEST

  if (!connectionString) {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    connectionString = container.getConnectionUri()
  }

  sql = postgres(connectionString, { max: 1 })
  testDb = drizzle(sql, { schema })
  await migrate(testDb, { migrationsFolder: './drizzle' })

  // Provision a persistent test company (committed, not in a transaction) so
  // all withRollback tests can reference a stable companyId.
  const [existing] = await testDb
    .select({ id: schema.companies.id })
    .from(schema.companies)
    .where(eq(schema.companies.clerkOrgId, TEST_CLERK_ORG_ID))
    .limit(1)

  if (existing) {
    TEST_COMPANY_ID = existing.id
  } else {
    const [created] = await testDb
      .insert(schema.companies)
      .values({ clerkOrgId: TEST_CLERK_ORG_ID })
      .returning({ id: schema.companies.id })
    TEST_COMPANY_ID = created.id
  }
}

/** Stops the connection and container (if one was started). Call in afterAll(). */
export async function stopTestDb(): Promise<void> {
  await sql?.end()
  await container?.stop()
}

/**
 * Wraps a test in a transaction that is always rolled back.
 * Guarantees no data leaks between tests.
 */
export async function withRollback(
  fn: (db: PostgresJsDatabase<typeof schema>) => Promise<void>,
): Promise<void> {
  await sql.begin(async (txSql: TransactionSql) => {
    const txDb = drizzle(txSql as unknown as Sql, { schema })
    await fn(txDb)
    throw new RollbackSignal()
  }).catch(err => {
    if (err instanceof RollbackSignal) return
    throw err
  })
}
