import { asc, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { startTestDb, stopTestDb, withRollback } from '../test/helpers/db'
import { buildClient } from '../test/helpers/factories'
import { clients } from '@/lib/schema'
import type * as schema from '@/lib/schema'

// ── ensureClientExists helper (mirrors the action logic) ───────────────────

async function ensureClient(
  db: PostgresJsDatabase<typeof schema>,
  name: string,
  address?: string,
) {
  const existing = await db.select().from(clients).where(eq(clients.name, name)).limit(1)
  if (existing.length > 0) return existing[0]
  const [created] = await db.insert(clients).values({ name, address: address ?? null }).returning()
  return created
}

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

// ── helpers that mirror what the data layer does ───────────────────────────

async function insertClient(db: PostgresJsDatabase<typeof schema>, data: ReturnType<typeof buildClient>) {
  const [row] = await db.insert(clients).values(data).returning()
  return row
}

async function listClients(db: PostgresJsDatabase<typeof schema>) {
  return db.select().from(clients).orderBy(asc(clients.name))
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('clients — DB integration', () => {
  test('inserts a client and returns it with an id', async () => {
    await withRollback(async (db) => {
      const input = buildClient({ name: 'Acme Irrigation' })
      const row = await insertClient(db, input)

      expect(row.id).toBeDefined()
      expect(row.name).toBe('Acme Irrigation')
      expect(row.email).toBe(input.email)
      expect(row.createdAt).toBeDefined()
    })
  })

  test('lists clients sorted alphabetically by name', async () => {
    await withRollback(async (db) => {
      await insertClient(db, buildClient({ name: 'Zephyr Farms' }))
      await insertClient(db, buildClient({ name: 'Acme Corp' }))
      await insertClient(db, buildClient({ name: 'Midtown HOA' }))

      const rows = await listClients(db)
      const names = rows.map(r => r.name)

      expect(names).toEqual([...names].sort())
    })
  })

  test('transaction rollback leaves no data between tests', async () => {
    await withRollback(async (db) => {
      const rows = await listClients(db)
      expect(rows).toHaveLength(0)
    })
  })

  test('rejects insert when name is empty (Zod validation)', async () => {
    const { createClientSchema } = await import('@/lib/validators')
    const result = createClientSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toMatch(/required/i)
  })
})

describe('ensureClientExists — DB integration', () => {
  test('creates a new client when no match exists', async () => {
    await withRollback(async (db) => {
      const client = await ensureClient(db, 'New Owner LLC', '123 Main St')
      expect(client.id).toBeDefined()
      expect(client.name).toBe('New Owner LLC')
      expect(client.address).toBe('123 Main St')

      const all = await db.select().from(clients)
      expect(all).toHaveLength(1)
    })
  })

  test('returns the existing client when name already exists', async () => {
    await withRollback(async (db) => {
      const first = await ensureClient(db, 'Existing Corp')
      const second = await ensureClient(db, 'Existing Corp', '456 Other St')

      expect(second.id).toBe(first.id)
      // address should NOT have been updated — we returned the existing row
      expect(second.address).toBe(first.address)

      const all = await db.select().from(clients)
      expect(all).toHaveLength(1)
    })
  })

  test('two different names create two separate clients', async () => {
    await withRollback(async (db) => {
      await ensureClient(db, 'Owner A')
      await ensureClient(db, 'Owner B')

      const all = await db.select().from(clients)
      expect(all).toHaveLength(2)
    })
  })
})
