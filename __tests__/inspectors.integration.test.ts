import { and, asc, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { startTestDb, stopTestDb, withRollback, TEST_COMPANY_ID } from '../test/helpers/db'
import { companies, inspectors } from '@/lib/schema'
import type * as schema from '@/lib/schema'

beforeAll(async () => { await startTestDb() }, 60_000)
afterAll(async () => { await stopTestDb() })

// ── helpers (mirror action logic without auth dependency) ──────────────────

async function createInspectorRow(
  db: PostgresJsDatabase<typeof schema>,
  data: { firstName: string; lastName: string; email?: string; phone?: string; licenseNum?: string },
) {
  const [row] = await db.insert(inspectors).values({ companyId: TEST_COMPANY_ID, ...data }).returning()
  return row
}

async function listInspectors(db: PostgresJsDatabase<typeof schema>) {
  return db
    .select()
    .from(inspectors)
    .where(eq(inspectors.companyId, TEST_COMPANY_ID))
    .orderBy(asc(inspectors.lastName), asc(inspectors.firstName))
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('inspectors — DB integration', () => {
  test('inserts an inspector and returns it with an id', async () => {
    await withRollback(async (db) => {
      const row = await createInspectorRow(db, {
        firstName: 'Jane', lastName: 'Smith',
        email: 'jane@example.com', phone: '555-1234', licenseNum: 'TX-001',
      })
      expect(row.id).toBeDefined()
      expect(row.firstName).toBe('Jane')
      expect(row.lastName).toBe('Smith')
      expect(row.licenseNum).toBe('TX-001')
      expect(row.companyId).toBe(TEST_COMPANY_ID)
    })
  })

  test('lists inspectors ordered by lastName then firstName', async () => {
    await withRollback(async (db) => {
      await createInspectorRow(db, { firstName: 'Bob', lastName: 'Zebra' })
      await createInspectorRow(db, { firstName: 'Alice', lastName: 'Apple' })
      await createInspectorRow(db, { firstName: 'Charlie', lastName: 'Apple' })

      const list = await listInspectors(db)
      const lastName = list.map(i => i.lastName)
      const firstNameAtIdx0 = list.find(i => i.lastName === 'Apple' && i.firstName === 'Alice')
      const firstNameAtIdx1 = list.find(i => i.lastName === 'Apple' && i.firstName === 'Charlie')

      // Apple comes before Zebra
      expect(lastName.indexOf('Apple')).toBeLessThan(lastName.indexOf('Zebra'))
      // Alice Apple comes before Charlie Apple
      expect(list.indexOf(firstNameAtIdx0!)).toBeLessThan(list.indexOf(firstNameAtIdx1!))
    })
  })

  test('updates an inspector field', async () => {
    await withRollback(async (db) => {
      const inspector = await createInspectorRow(db, { firstName: 'Old', lastName: 'Name' })

      const [updated] = await db
        .update(inspectors)
        .set({ licenseNum: 'LIC-999' })
        .where(and(eq(inspectors.companyId, TEST_COMPANY_ID), eq(inspectors.id, inspector.id)))
        .returning()

      expect(updated.licenseNum).toBe('LIC-999')
      expect(updated.firstName).toBe('Old') // other fields unchanged
    })
  })

  test('update with wrong companyId touches no rows (cross-tenant guard)', async () => {
    await withRollback(async (db) => {
      const [otherCompany] = await db
        .insert(companies)
        .values({ clerkOrgId: 'org_other_inspector_test' })
        .returning()
      const inspector = await createInspectorRow(db, { firstName: 'Alice', lastName: 'Smith' })

      // Attempt update scoped to the WRONG company
      const rows = await db
        .update(inspectors)
        .set({ licenseNum: 'HACK-999' })
        .where(and(eq(inspectors.companyId, otherCompany.id), eq(inspectors.id, inspector.id)))
        .returning()

      expect(rows).toHaveLength(0) // nothing updated
      const [unchanged] = await db.select().from(inspectors).where(eq(inspectors.id, inspector.id))
      expect(unchanged.licenseNum).toBeNull()
    })
  })

  test('inspectors from different companies are isolated', async () => {
    await withRollback(async (db) => {
      const [otherCompany] = await db
        .insert(companies)
        .values({ clerkOrgId: 'org_other_inspector_list_test' })
        .returning()
      await db.insert(inspectors).values({ companyId: otherCompany.id, firstName: 'Other', lastName: 'Inspector' })

      const list = await listInspectors(db)
      expect(list.every(i => i.companyId === TEST_COMPANY_ID)).toBe(true)
      expect(list.find(i => i.lastName === 'Inspector')).toBeUndefined()
    })
  })
})
