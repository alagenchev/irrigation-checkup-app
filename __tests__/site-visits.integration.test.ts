import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { startTestDb, stopTestDb, withRollback } from '../test/helpers/db'
import { buildClient } from '../test/helpers/factories'
import { clients, inspectors, sites, technicians, siteVisits } from '@/lib/schema'
import type * as schema from '@/lib/schema'

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

// ── helpers ────────────────────────────────────────────────────────────────

async function insertSite(db: PostgresJsDatabase<typeof schema>, name = 'Test Site') {
  const [row] = await db.insert(sites).values({ name }).returning()
  return row
}

async function insertClient(db: PostgresJsDatabase<typeof schema>, name = 'Test Client') {
  const [row] = await db.insert(clients).values(buildClient({ name })).returning()
  return row
}

async function insertTechnician(db: PostgresJsDatabase<typeof schema>, name = 'Jane Smith') {
  const [row] = await db.insert(technicians).values({ name }).returning()
  return row
}

async function insertInspector(db: PostgresJsDatabase<typeof schema>, firstName = 'Jane', lastName = 'Smith') {
  const [row] = await db.insert(inspectors).values({ firstName, lastName }).returning()
  return row
}

async function insertVisit(
  db: PostgresJsDatabase<typeof schema>,
  siteId: number,
  datePerformed: string,
  overrides: Partial<typeof siteVisits.$inferInsert> = {},
) {
  const [row] = await db
    .insert(siteVisits)
    .values({ siteId, datePerformed, ...overrides })
    .returning()
  return row
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('site_visits — DB integration', () => {
  test('inserts a visit with required fields and applies schema defaults', async () => {
    await withRollback(async (db) => {
      const site  = await insertSite(db)
      const visit = await insertVisit(db, site.id, '2025-06-15')

      expect(visit.siteVisitId).toBeDefined()
      expect(visit.siteId).toBe(site.id)
      expect(visit.datePerformed).toBe('2025-06-15')
      expect(visit.inspectionType).toBe('Repair Inspection')
      expect(visit.status).toBe('New')
      expect(visit.backflowInstalled).toBe(false)
      expect(visit.backflowServiceable).toBe(false)
      expect(visit.isolationValve).toBe(false)
    })
  })

  test('stores FK references to client and inspector', async () => {
    await withRollback(async (db) => {
      const site      = await insertSite(db)
      const client    = await insertClient(db)
      const inspector = await insertInspector(db)

      const visit = await insertVisit(db, site.id, '2025-06-15', {
        clientId:    client.id,
        inspectorId: inspector.id,
      })

      expect(visit.clientId).toBe(client.id)
      expect(visit.inspectorId).toBe(inspector.id)
    })
  })

  test('unique constraint prevents two visits for the same site on the same date', async () => {
    await withRollback(async (db) => {
      const site = await insertSite(db)
      await insertVisit(db, site.id, '2025-06-15')

      await expect(insertVisit(db, site.id, '2025-06-15')).rejects.toThrow()
    })
  })

  test('allows the same date for different sites', async () => {
    await withRollback(async (db) => {
      const siteA = await insertSite(db, 'Site A')
      const siteB = await insertSite(db, 'Site B')

      await insertVisit(db, siteA.id, '2025-06-15')
      const visitB = await insertVisit(db, siteB.id, '2025-06-15')

      expect(visitB.siteVisitId).toBeDefined()
    })
  })

  test('deleting site is prevented when visits exist (onDelete: restrict)', async () => {
    await withRollback(async (db) => {
      const site = await insertSite(db)
      await insertVisit(db, site.id, '2025-06-15')

      await expect(
        db.delete(sites).where(eq(sites.id, site.id))
      ).rejects.toThrow()
    })
  })

  test('nullifies inspectorId when inspector is deleted (onDelete: set null)', async () => {
    await withRollback(async (db) => {
      const site      = await insertSite(db)
      const inspector = await insertInspector(db)
      const visit     = await insertVisit(db, site.id, '2025-06-15', { inspectorId: inspector.id })

      await db.delete(inspectors).where(eq(inspectors.id, inspector.id))

      const [row] = await db
        .select()
        .from(siteVisits)
        .where(eq(siteVisits.siteVisitId, visit.siteVisitId))
      expect(row.inspectorId).toBeNull()
    })
  })

  test('stores and retrieves JSONB zone issues snapshot', async () => {
    await withRollback(async (db) => {
      const site   = await insertSite(db)
      const issues = [{ zoneNum: '1', issues: ['Runoff', 'Overspray'] }]

      const visit = await insertVisit(db, site.id, '2025-06-15', { zoneIssues: issues })

      const [row] = await db
        .select()
        .from(siteVisits)
        .where(eq(siteVisits.siteVisitId, visit.siteVisitId))
      expect(row.zoneIssues).toEqual(issues)
    })
  })
})

describe('site_visits — system overview auto-population', () => {
  test('new visit inherits system overview from most recent prior visit', async () => {
    await withRollback(async (db) => {
      const site = await insertSite(db)

      await insertVisit(db, site.id, '2025-05-01', {
        staticPressure:      '70.5',
        backflowInstalled:   true,
        backflowServiceable: true,
        isolationValve:      true,
        systemNotes:         'Hunter Pro-HC, 6 zones',
      })

      // Simulate action: fetch prior and carry forward
      const [prior] = await db.select().from(siteVisits).where(eq(siteVisits.siteId, site.id))

      const newVisit = await insertVisit(db, site.id, '2025-06-01', {
        staticPressure:      prior.staticPressure      ?? undefined,
        backflowInstalled:   prior.backflowInstalled,
        backflowServiceable: prior.backflowServiceable,
        isolationValve:      prior.isolationValve,
        systemNotes:         prior.systemNotes         ?? undefined,
      })

      expect(newVisit.staticPressure).toBe('70.5')
      expect(newVisit.backflowInstalled).toBe(true)
      expect(newVisit.backflowServiceable).toBe(true)
      expect(newVisit.isolationValve).toBe(true)
      expect(newVisit.systemNotes).toBe('Hunter Pro-HC, 6 zones')
    })
  })

  test('caller-provided values override prior visit values', async () => {
    await withRollback(async (db) => {
      const site = await insertSite(db)

      await insertVisit(db, site.id, '2025-05-01', {
        staticPressure: '70.0',
        systemNotes:    'Old notes',
      })

      const newVisit = await insertVisit(db, site.id, '2025-06-01', {
        staticPressure: '75.0',  // caller overrides
        systemNotes:    'Updated notes',
      })

      expect(newVisit.staticPressure).toBe('75.0')
      expect(newVisit.systemNotes).toBe('Updated notes')
    })
  })
})
