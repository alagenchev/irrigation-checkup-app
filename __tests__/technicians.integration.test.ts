import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { startTestDb, stopTestDb, withRollback, TEST_COMPANY_ID } from '../test/helpers/db'
import { companies, technicians } from '@/lib/schema'
import type * as schema from '@/lib/schema'

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

// ── ensureTechnician helper (mirrors the action logic) ─────────────────────

async function ensureTechnician(db: PostgresJsDatabase<typeof schema>, name: string) {
  const existing = await db
    .select()
    .from(technicians)
    .where(and(eq(technicians.companyId, TEST_COMPANY_ID), eq(technicians.name, name)))
    .limit(1)
  if (existing.length > 0) return existing[0]
  const [created] = await db.insert(technicians).values({ companyId: TEST_COMPANY_ID, name }).returning()
  return created
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('technicians — DB integration', () => {
  test('inserts a technician and returns it with an id', async () => {
    await withRollback(async (db) => {
      const row = await ensureTechnician(db, 'Jane Smith')
      expect(row.id).toBeDefined()
      expect(row.name).toBe('Jane Smith')
      expect(row.companyId).toBe(TEST_COMPANY_ID)
      expect(row.createdAt).toBeDefined()
    })
  })

  test('returns the existing technician when name already exists', async () => {
    await withRollback(async (db) => {
      const first  = await ensureTechnician(db, 'John Doe')
      const second = await ensureTechnician(db, 'John Doe')

      expect(second.id).toBe(first.id)

      const all = await db
        .select()
        .from(technicians)
        .where(eq(technicians.companyId, TEST_COMPANY_ID))
      expect(all).toHaveLength(1)
    })
  })

  test('two different names create two separate technicians', async () => {
    await withRollback(async (db) => {
      await ensureTechnician(db, 'Alice')
      await ensureTechnician(db, 'Bob')

      const all = await db
        .select()
        .from(technicians)
        .where(eq(technicians.companyId, TEST_COMPANY_ID))
      expect(all).toHaveLength(2)
    })
  })

  test('name is unique per company at the DB level', async () => {
    await withRollback(async (db) => {
      await db.insert(technicians).values({ companyId: TEST_COMPANY_ID, name: 'Duplicate Tech' })
      await expect(
        db.insert(technicians).values({ companyId: TEST_COMPANY_ID, name: 'Duplicate Tech' })
      ).rejects.toThrow()
    })
  })

  test('same name is allowed for different companies', async () => {
    await withRollback(async (db) => {
      const [otherCompany] = await db
        .insert(companies)
        .values({ clerkOrgId: 'org_other_tech_test' })
        .returning()

      await db.insert(technicians).values({ companyId: TEST_COMPANY_ID, name: 'Cross-Tenant Tech' })
      // Should not throw — different company, same name is allowed
      const [otherTech] = await db
        .insert(technicians)
        .values({ companyId: otherCompany.id, name: 'Cross-Tenant Tech' })
        .returning()
      expect(otherTech.id).toBeDefined()
    })
  })
})
