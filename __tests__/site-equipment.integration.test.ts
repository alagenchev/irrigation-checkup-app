import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { startTestDb, stopTestDb, withRollback } from '../test/helpers/db'
import { sites, siteControllers, siteZones, siteBackflows } from '@/lib/schema'
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

// ── controllers ────────────────────────────────────────────────────────────

describe('site_controllers — DB integration', () => {
  test('inserts a controller linked to a site', async () => {
    await withRollback(async (db) => {
      const site = await insertSite(db)
      const [ctrl] = await db
        .insert(siteControllers)
        .values({ siteId: site.id, manufacturer: 'Hunter', model: 'Pro-HC', numZones: '6' })
        .returning()

      expect(ctrl.id).toBeDefined()
      expect(ctrl.siteId).toBe(site.id)
      expect(ctrl.manufacturer).toBe('Hunter')
      expect(ctrl.masterValve).toBe(false)
    })
  })

  test('cascades delete when site is deleted', async () => {
    await withRollback(async (db) => {
      const site = await insertSite(db)
      await db.insert(siteControllers).values({ siteId: site.id, manufacturer: 'Rachio' })

      await db.delete(sites).where(eq(sites.id, site.id))

      const remaining = await db
        .select()
        .from(siteControllers)
        .where(eq(siteControllers.siteId, site.id))
      expect(remaining).toHaveLength(0)
    })
  })
})

// ── zones ──────────────────────────────────────────────────────────────────

describe('site_zones — DB integration', () => {
  test('inserts a zone with landscape and irrigation types as text arrays', async () => {
    await withRollback(async (db) => {
      const site = await insertSite(db)
      const [zone] = await db
        .insert(siteZones)
        .values({
          siteId:          site.id,
          zoneNum:         '1',
          description:     'Front lawn',
          landscapeTypes:  ['Full-sun turf', 'Slope'],
          irrigationTypes: ['Rotor'],
        })
        .returning()

      expect(zone.id).toBeDefined()
      expect(zone.landscapeTypes).toEqual(['Full-sun turf', 'Slope'])
      expect(zone.irrigationTypes).toEqual(['Rotor'])
    })
  })

  test('links zone to a controller via FK', async () => {
    await withRollback(async (db) => {
      const site = await insertSite(db)
      const [ctrl] = await db
        .insert(siteControllers)
        .values({ siteId: site.id })
        .returning()
      const [zone] = await db
        .insert(siteZones)
        .values({ siteId: site.id, zoneNum: '2', controllerId: ctrl.id })
        .returning()

      expect(zone.controllerId).toBe(ctrl.id)
    })
  })

  test('sets controllerId to null when controller is deleted (onDelete: set null)', async () => {
    await withRollback(async (db) => {
      const site = await insertSite(db)
      const [ctrl] = await db.insert(siteControllers).values({ siteId: site.id }).returning()
      const [zone] = await db
        .insert(siteZones)
        .values({ siteId: site.id, zoneNum: '1', controllerId: ctrl.id })
        .returning()

      await db.delete(siteControllers).where(eq(siteControllers.id, ctrl.id))

      const [updated] = await db.select().from(siteZones).where(eq(siteZones.id, zone.id))
      expect(updated.controllerId).toBeNull()
    })
  })

  test('cascades delete when site is deleted', async () => {
    await withRollback(async (db) => {
      const site = await insertSite(db)
      await db.insert(siteZones).values({ siteId: site.id, zoneNum: '1' })

      await db.delete(sites).where(eq(sites.id, site.id))

      const remaining = await db.select().from(siteZones).where(eq(siteZones.siteId, site.id))
      expect(remaining).toHaveLength(0)
    })
  })
})

// ── backflows ──────────────────────────────────────────────────────────────

describe('site_backflows — DB integration', () => {
  test('inserts a backflow device linked to a site', async () => {
    await withRollback(async (db) => {
      const site = await insertSite(db)
      const [bf] = await db
        .insert(siteBackflows)
        .values({ siteId: site.id, manufacturer: 'Febco', type: 'RPZ', model: '825Y', size: '1' })
        .returning()

      expect(bf.id).toBeDefined()
      expect(bf.siteId).toBe(site.id)
      expect(bf.manufacturer).toBe('Febco')
    })
  })

  test('a site can have multiple backflow devices', async () => {
    await withRollback(async (db) => {
      const site = await insertSite(db)
      await db.insert(siteBackflows).values({ siteId: site.id, type: 'RPZ' })
      await db.insert(siteBackflows).values({ siteId: site.id, type: 'PVB' })

      const all = await db.select().from(siteBackflows).where(eq(siteBackflows.siteId, site.id))
      expect(all).toHaveLength(2)
    })
  })

  test('cascades delete when site is deleted', async () => {
    await withRollback(async (db) => {
      const site = await insertSite(db)
      await db.insert(siteBackflows).values({ siteId: site.id, type: 'RPZ' })

      await db.delete(sites).where(eq(sites.id, site.id))

      const remaining = await db
        .select()
        .from(siteBackflows)
        .where(eq(siteBackflows.siteId, site.id))
      expect(remaining).toHaveLength(0)
    })
  })
})
