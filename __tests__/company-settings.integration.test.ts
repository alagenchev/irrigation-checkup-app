import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { startTestDb, stopTestDb, withRollback } from '../test/helpers/db'
import { buildCompanySettings } from '../test/helpers/factories'
import { companySettings } from '@/lib/schema'
import type * as schema from '@/lib/schema'

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

// ── helpers ────────────────────────────────────────────────────────────────

async function upsert(db: PostgresJsDatabase<typeof schema>, overrides = {}) {
  const data = buildCompanySettings(overrides)
  const [row] = await db
    .insert(companySettings)
    .values(data)
    .onConflictDoUpdate({
      target: companySettings.id,
      set: { ...data, updatedAt: new Date() },
    })
    .returning()
  return row
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('company_settings — DB integration', () => {
  test('upsert creates a row with id=1', async () => {
    await withRollback(async (db) => {
      const row = await upsert(db, { companyName: 'Test Co' })
      expect(row.id).toBe(1)
      expect(row.companyName).toBe('Test Co')
    })
  })

  test('second upsert updates the row without creating a second row', async () => {
    await withRollback(async (db) => {
      await upsert(db, { companyName: 'First Name' })
      await upsert(db, { companyName: 'Updated Name' })

      const rows = await db.select().from(companySettings).where(eq(companySettings.id, 1))
      expect(rows).toHaveLength(1)
      expect(rows[0].companyName).toBe('Updated Name')
    })
  })

  test('returns null when no row exists (caller should fall back to defaults)', async () => {
    await withRollback(async (db) => {
      const rows = await db.select().from(companySettings).where(eq(companySettings.id, 1))
      expect(rows).toHaveLength(0)
    })
  })
})
