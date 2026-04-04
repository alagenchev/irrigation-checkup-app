import { execSync } from 'child_process'

/**
 * Reset the test database to a clean state.
 * Call once before running all tests (in beforeAll hook).
 */
export function resetDb() {
  execSync('DATABASE_URL=postgresql://localhost:5432/irrigation_test npx tsx scripts/migrate.ts', {
    stdio: 'inherit',
  })
}
