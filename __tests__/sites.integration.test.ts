import { and, asc, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { startTestDb, stopTestDb, withRollback, TEST_COMPANY_ID } from '../test/helpers/db'
import { buildClient } from '../test/helpers/factories'
import { clients, companies, sites } from '@/lib/schema'
import type * as schema from '@/lib/schema'

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

// ── helpers ────────────────────────────────────────────────────────────────

async function insertClient(db: PostgresJsDatabase<typeof schema>, name: string) {
  const [row] = await db.insert(clients).values(buildClient(TEST_COMPANY_ID, { name })).returning()
  return row
}

async function insertSite(
  db: PostgresJsDatabase<typeof schema>,
  name: string,
  clientId: number | null = null,
) {
  const [row] = await db.insert(sites).values({ companyId: TEST_COMPANY_ID, name, clientId }).returning()
  return row
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('sites — DB integration', () => {
  test('inserts a site without a client', async () => {
    await withRollback(async (db) => {
      const site = await insertSite(db, 'Standalone Site')
      expect(site.id).toBeDefined()
      expect(site.name).toBe('Standalone Site')
      expect(site.companyId).toBe(TEST_COMPANY_ID)
      expect(site.clientId).toBeNull()
    })
  })

  test('inserts a site linked to an existing client', async () => {
    await withRollback(async (db) => {
      const client = await insertClient(db, 'Acme Corp')
      const site   = await insertSite(db, 'Acme HQ', client.id)

      expect(site.clientId).toBe(client.id)
    })
  })

  test('lists sites with client name via left join', async () => {
    await withRollback(async (db) => {
      const client = await insertClient(db, 'Test Client')
      await insertSite(db, 'Linked Site', client.id)
      await insertSite(db, 'Unlinked Site')

      const rows = await db
        .select({ siteName: sites.name, clientName: clients.name })
        .from(sites)
        .leftJoin(clients, eq(sites.clientId, clients.id))
        .where(eq(sites.companyId, TEST_COMPANY_ID))
        .orderBy(asc(sites.name))

      expect(rows).toHaveLength(2)
      expect(rows.find(r => r.siteName === 'Linked Site')?.clientName).toBe('Test Client')
      expect(rows.find(r => r.siteName === 'Unlinked Site')?.clientName).toBeNull()
    })
  })

  test('deleting a client sets site clientId to null (onDelete: set null)', async () => {
    await withRollback(async (db) => {
      const client = await insertClient(db, 'To Be Deleted')
      const site   = await insertSite(db, 'Orphaned Site', client.id)

      await db.delete(clients).where(eq(clients.id, client.id))

      const [updated] = await db.select().from(sites).where(eq(sites.id, site.id))
      expect(updated.clientId).toBeNull()
    })
  })

  test('lists sites with clientAddress via left join', async () => {
    await withRollback(async (db) => {
      const [client] = await db
        .insert(clients)
        .values({ companyId: TEST_COMPANY_ID, name: 'Address Client', address: '789 Client Ave' })
        .returning()
      await insertSite(db, 'Address Site', client.id)

      const rows = await db
        .select({
          siteName:      sites.name,
          clientName:    clients.name,
          clientAddress: clients.address,
        })
        .from(sites)
        .leftJoin(clients, eq(sites.clientId, clients.id))
        .where(eq(sites.companyId, TEST_COMPANY_ID))

      expect(rows).toHaveLength(1)
      expect(rows[0].clientAddress).toBe('789 Client Ave')
    })
  })

  test('sites from different companies are isolated', async () => {
    await withRollback(async (db) => {
      const [otherCompany] = await db
        .insert(companies)
        .values({ clerkOrgId: 'org_other_sites_test' })
        .returning()
      await db.insert(sites).values({ companyId: otherCompany.id, name: 'Other Co Site' })

      const rows = await db
        .select()
        .from(sites)
        .where(eq(sites.companyId, TEST_COMPANY_ID))

      expect(rows.every(r => r.companyId === TEST_COMPANY_ID)).toBe(true)
      expect(rows.find(r => r.name === 'Other Co Site')).toBeUndefined()
    })
  })

  test('rejects insert when site name is empty (Zod validation)', async () => {
    const { createSiteSchema } = await import('@/lib/validators')
    const result = createSiteSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toMatch(/required/i)
  })
})
