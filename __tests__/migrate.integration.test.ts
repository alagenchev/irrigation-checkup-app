import { execSync } from 'child_process'
import { PostgreSqlContainer } from '@testcontainers/postgresql'

/**
 * Verifies that scripts/migrate.ts executes successfully against a fresh database.
 * Catches issues like: top-level await in CJS, missing imports, wrong output format.
 *
 * Uses a fresh throwaway container so it always runs against a clean schema —
 * no "relation already exists" false failures from a reused local database.
 */
describe('scripts/migrate.ts', () => {
  test('runs without errors against a fresh database', async () => {
    const container = await new PostgreSqlContainer('postgres:16-alpine').start()

    try {
      execSync(`DATABASE_URL=${container.getConnectionUri()} npx tsx scripts/migrate.ts`, {
        cwd: process.cwd(),
        stdio: 'pipe',
      })
    } finally {
      await container.stop()
    }
  }, 60_000)
})
