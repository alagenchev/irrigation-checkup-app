import { PoolClient } from 'pg'
import { startTestDb, stopTestDb, withRollback } from '../test/helpers/db'
import { buildClient } from '../test/helpers/factories'

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

// ── helpers that mirror what the API routes do ────────────────────────────

async function insertClient(client: PoolClient, data: ReturnType<typeof buildClient>) {
  const result = await client.query(
    `INSERT INTO clients (name, address, phone, email, account_type, account_number)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.name, data.address, data.phone, data.email, data.account_type, data.account_number]
  )
  return result.rows[0]
}

async function listClients(client: PoolClient) {
  const result = await client.query('SELECT * FROM clients ORDER BY name ASC')
  return result.rows
}

// ── tests ─────────────────────────────────────────────────────────────────

describe('clients — DB integration', () => {
  test('inserts a client and returns it with an id', async () => {
    await withRollback(async (client) => {
      const input = buildClient({ name: 'Acme Irrigation' })
      const row = await insertClient(client, input)

      expect(row.id).toBeDefined()
      expect(row.name).toBe('Acme Irrigation')
      expect(row.email).toBe(input.email)
      expect(row.created_at).toBeDefined()
    })
  })

  test('lists clients sorted alphabetically by name', async () => {
    await withRollback(async (client) => {
      await insertClient(client, buildClient({ name: 'Zephyr Farms' }))
      await insertClient(client, buildClient({ name: 'Acme Corp' }))
      await insertClient(client, buildClient({ name: 'Midtown HOA' }))

      const rows = await listClients(client)
      const names = rows.map((r: { name: string }) => r.name)

      expect(names).toEqual([...names].sort())
    })
  })

  test('transaction rollback leaves no data between tests', async () => {
    // This test verifies the isolation guarantee — if rollback works, the
    // clients inserted in the previous test are gone.
    await withRollback(async (client) => {
      const rows = await listClients(client)
      expect(rows).toHaveLength(0)
    })
  })

  test('rejects insert when name is null (NOT NULL constraint)', async () => {
    await withRollback(async (client) => {
      await expect(
        client.query(
          `INSERT INTO clients (name) VALUES ($1)`,
          [null]
        )
      ).rejects.toThrow(/null value in column "name"/)
    })
  })
})
