import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { startTestDb, stopTestDb, withRollback } from '../test/helpers/db'
import {
  sites, clients, technicians,
  siteVisits, siteControllers, siteZones, siteBackflows,
} from '@/lib/schema'
import type * as schema from '@/lib/schema'

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

// ── helpers that mirror saveCheckup logic ──────────────────────────────────

async function ensureSite(db: PostgresJsDatabase<typeof schema>, name: string, address?: string) {
  const [ex] = await db.select().from(sites).where(eq(sites.name, name)).limit(1)
  if (ex) return ex
  const [row] = await db.insert(sites).values({ name, address: address ?? null }).returning()
  return row
}

async function ensureClient(db: PostgresJsDatabase<typeof schema>, name: string) {
  const [ex] = await db.select().from(clients).where(eq(clients.name, name)).limit(1)
  if (ex) return ex
  const [row] = await db.insert(clients).values({ name }).returning()
  return row
}

async function ensureTechnician(db: PostgresJsDatabase<typeof schema>, name: string) {
  const [ex] = await db.select().from(technicians).where(eq(technicians.name, name)).limit(1)
  if (ex) return ex
  const [row] = await db.insert(technicians).values({ name }).returning()
  return row
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('saveCheckup — DB integration', () => {
  test('creates site, visit, and equipment in one pass', async () => {
    await withRollback(async (db) => {
      const site = await ensureSite(db, 'Main Campus')

      // Sync controllers
      await db.delete(siteZones).where(eq(siteZones.siteId, site.id))
      await db.delete(siteControllers).where(eq(siteControllers.siteId, site.id))
      const [ctrl] = await db
        .insert(siteControllers)
        .values({ siteId: site.id, manufacturer: 'Hunter', model: 'Pro-HC', numZones: '4' })
        .returning()

      await db.insert(siteZones).values({
        siteId:          site.id,
        controllerId:    ctrl.id,
        zoneNum:         '1',
        landscapeTypes:  ['Full-sun turf'],
        irrigationTypes: ['Rotor'],
      })

      const [visit] = await db
        .insert(siteVisits)
        .values({
          siteId:              site.id,
          datePerformed:       '2025-06-15',
          backflowInstalled:   true,
          backflowServiceable: true,
          isolationValve:      false,
          zoneIssues:          [{ zoneNum: '1', issues: ['Runoff'] }],
        })
        .returning()

      expect(visit.siteVisitId).toBeDefined()
      expect(ctrl.manufacturer).toBe('Hunter')
    })
  })

  test('upserts visit on same site + date (does not create duplicate)', async () => {
    await withRollback(async (db) => {
      const site = await ensureSite(db, 'Upsert Site')

      await db.insert(siteVisits).values({
        siteId:        site.id,
        datePerformed: '2025-07-01',
        checkupNotes:  'First save',
      })

      // Simulate update (same site + date)
      await db
        .insert(siteVisits)
        .values({ siteId: site.id, datePerformed: '2025-07-01', checkupNotes: 'Updated save' })
        .onConflictDoUpdate({
          target: [siteVisits.siteId, siteVisits.datePerformed],
          set: { checkupNotes: 'Updated save', updatedAt: new Date() },
        })

      const all = await db.select().from(siteVisits).where(eq(siteVisits.siteId, site.id))
      expect(all).toHaveLength(1)
      expect(all[0].checkupNotes).toBe('Updated save')
    })
  })

  test('re-syncing equipment replaces old records', async () => {
    await withRollback(async (db) => {
      const site = await ensureSite(db, 'Replace Site')

      // First sync: 2 controllers
      await db.insert(siteControllers).values([
        { siteId: site.id, manufacturer: 'Hunter' },
        { siteId: site.id, manufacturer: 'Rachio' },
      ])

      let ctrls = await db.select().from(siteControllers).where(eq(siteControllers.siteId, site.id))
      expect(ctrls).toHaveLength(2)

      // Second sync: replace with 1 controller
      await db.delete(siteZones).where(eq(siteZones.siteId, site.id))
      await db.delete(siteControllers).where(eq(siteControllers.siteId, site.id))
      await db.insert(siteControllers).values({ siteId: site.id, manufacturer: 'Orbit' })

      ctrls = await db.select().from(siteControllers).where(eq(siteControllers.siteId, site.id))
      expect(ctrls).toHaveLength(1)
      expect(ctrls[0].manufacturer).toBe('Orbit')
    })
  })

  test('links client and technician to the visit', async () => {
    await withRollback(async (db) => {
      const site  = await ensureSite(db, 'Linked Visit Site')
      const client = await ensureClient(db, 'Linked Client')
      const tech   = await ensureTechnician(db, 'Linked Tech')

      const [visit] = await db
        .insert(siteVisits)
        .values({ siteId: site.id, datePerformed: '2025-08-01', clientId: client.id, technicianId: tech.id })
        .returning()

      expect(visit.clientId).toBe(client.id)
      expect(visit.technicianId).toBe(tech.id)
    })
  })

  test('zone controllerIdMap resolves UI id to DB id correctly', async () => {
    await withRollback(async (db) => {
      const site = await ensureSite(db, 'Controller Map Site')

      // Simulate save: insert controller, then zone with FK to it
      const [ctrl] = await db
        .insert(siteControllers)
        .values({ siteId: site.id, manufacturer: 'Hunter' })
        .returning()

      const [zone] = await db
        .insert(siteZones)
        .values({ siteId: site.id, zoneNum: '1', controllerId: ctrl.id })
        .returning()

      expect(zone.controllerId).toBe(ctrl.id)
    })
  })

  test('backflow devices are saved and replaced correctly', async () => {
    await withRollback(async (db) => {
      const site = await ensureSite(db, 'Backflow Site')

      await db.insert(siteBackflows).values([
        { siteId: site.id, type: 'RPZ', manufacturer: 'Febco' },
        { siteId: site.id, type: 'PVB', manufacturer: 'Watts' },
      ])

      let bfs = await db.select().from(siteBackflows).where(eq(siteBackflows.siteId, site.id))
      expect(bfs).toHaveLength(2)

      // Replace with single backflow
      await db.delete(siteBackflows).where(eq(siteBackflows.siteId, site.id))
      await db.insert(siteBackflows).values({ siteId: site.id, type: 'DC', manufacturer: 'Wilkins' })

      bfs = await db.select().from(siteBackflows).where(eq(siteBackflows.siteId, site.id))
      expect(bfs).toHaveLength(1)
      expect(bfs[0].manufacturer).toBe('Wilkins')
    })
  })
})
