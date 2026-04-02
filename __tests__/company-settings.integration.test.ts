import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { startTestDb, stopTestDb, withRollback, TEST_COMPANY_ID } from '../test/helpers/db'
import { buildCompanySettings } from '../test/helpers/factories'
import { companies, companySettings } from '@/lib/schema'
import type * as schema from '@/lib/schema'

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

// ── helpers ────────────────────────────────────────────────────────────────

async function upsert(db: PostgresJsDatabase<typeof schema>, overrides: Partial<typeof companySettings.$inferInsert> = {}) {
  const data = buildCompanySettings(TEST_COMPANY_ID, overrides)
  const [row] = await db
    .insert(companySettings)
    .values(data)
    .onConflictDoUpdate({
      target: companySettings.companyId,
      set: { ...data, updatedAt: new Date() },
    })
    .returning()
  return row
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('company_settings — DB integration', () => {
  test('upsert creates a row scoped to the company', async () => {
    await withRollback(async (db) => {
      const row = await upsert(db, { companyName: 'Test Co' })
      expect(row.companyId).toBe(TEST_COMPANY_ID)
      expect(row.companyName).toBe('Test Co')
    })
  })

  test('second upsert updates the row without creating a second row', async () => {
    await withRollback(async (db) => {
      await upsert(db, { companyName: 'First Name' })
      await upsert(db, { companyName: 'Updated Name' })

      const rows = await db
        .select()
        .from(companySettings)
        .where(eq(companySettings.companyId, TEST_COMPANY_ID))
      expect(rows).toHaveLength(1)
      expect(rows[0].companyName).toBe('Updated Name')
    })
  })

  test('returns no row when no settings have been saved for the company', async () => {
    await withRollback(async (db) => {
      const rows = await db
        .select()
        .from(companySettings)
        .where(eq(companySettings.companyId, TEST_COMPANY_ID))
      expect(rows).toHaveLength(0)
    })
  })

  test('each company has its own isolated settings row', async () => {
    await withRollback(async (db) => {
      const [otherCompany] = await db
        .insert(companies)
        .values({ clerkOrgId: 'org_other_settings_test' })
        .returning()

      await upsert(db, { companyName: 'Our Company' })
      const [otherRow] = await db
        .insert(companySettings)
        .values({ companyId: otherCompany.id, companyName: 'Their Company' })
        .returning()

      const ours = await db
        .select()
        .from(companySettings)
        .where(eq(companySettings.companyId, TEST_COMPANY_ID))
      expect(ours).toHaveLength(1)
      expect(ours[0].companyName).toBe('Our Company')

      expect(otherRow.companyName).toBe('Their Company')
      expect(otherRow.companyId).toBe(otherCompany.id)
    })
  })
})
