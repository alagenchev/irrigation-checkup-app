import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { startTestDb, stopTestDb, withRollback } from '../test/helpers/db'
import { inspectors } from '@/lib/schema'
import { getInspectors, createInspector, updateInspector } from '@/actions/inspectors'
import type * as schema from '@/lib/schema'

beforeAll(async () => { await startTestDb() }, 60_000)
afterAll(async () => { await stopTestDb() })

describe('inspectors — DB integration', () => {
  test('createInspector inserts and returns the new inspector', async () => {
    await withRollback(async () => {
      const result = await createInspector({
        firstName: 'Jane', lastName: 'Smith',
        email: 'jane@example.com', phone: '555-1234', licenseNum: 'TX-001',
      })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.data.firstName).toBe('Jane')
      expect(result.data.lastName).toBe('Smith')
      expect(result.data.licenseNum).toBe('TX-001')
    })
  })

  test('createInspector rejects when firstName is missing', async () => {
    await withRollback(async () => {
      const result = await createInspector({ firstName: '', lastName: 'Smith' })
      expect(result.ok).toBe(false)
    })
  })

  test('getInspectors returns all inspectors ordered by lastName', async () => {
    await withRollback(async (db: PostgresJsDatabase<typeof schema>) => {
      await db.insert(inspectors).values([
        { firstName: 'Bob', lastName: 'Zebra' },
        { firstName: 'Alice', lastName: 'Apple' },
      ])
      const list = await getInspectors()
      const names = list.map(i => i.lastName)
      const idx = (n: string) => names.indexOf(n)
      expect(idx('Apple')).toBeLessThan(idx('Zebra'))
    })
  })

  test('updateInspector modifies a field', async () => {
    await withRollback(async () => {
      const created = await createInspector({ firstName: 'Old', lastName: 'Name' })
      if (!created.ok) return
      const updated = await updateInspector(created.data.id, { licenseNum: 'LIC-999' })
      expect(updated.ok).toBe(true)
      if (!updated.ok) return
      expect(updated.data.licenseNum).toBe('LIC-999')
    })
  })
})
