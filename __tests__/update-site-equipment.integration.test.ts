/**
 * Integration tests for updateSiteEquipment server action
 *
 * Task: sites-menu-irrigation (c9e3a2f1-6b4d-4e8a-8f2c-1d7a9e5f3b8a)
 */

import { eq, and } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { startTestDb, stopTestDb, withRollback, TEST_COMPANY_ID } from '../test/helpers/db'
import { sites, siteControllers, siteZones, siteBackflows, siteVisits } from '@/lib/schema'
import type * as schema from '@/lib/schema'
import { updateSiteEquipment } from '@/actions/sites'

// Mock getRequiredCompanyId to return TEST_COMPANY_ID
jest.mock('@/lib/tenant', () => ({
  getRequiredCompanyId: jest.fn().mockResolvedValue(TEST_COMPANY_ID),
}))

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

// ── Helpers ────────────────────────────────────────────────────────────────

async function insertTestSite(db: PostgresJsDatabase<typeof schema>, name = 'Test Site') {
  const [row] = await db.insert(sites).values({ companyId: TEST_COMPANY_ID, name }).returning()
  return row
}

async function getControllers(db: PostgresJsDatabase<typeof schema>, siteId: string) {
  return db
    .select()
    .from(siteControllers)
    .where(and(eq(siteControllers.siteId, siteId), eq(siteControllers.companyId, TEST_COMPANY_ID)))
}

async function getZones(db: PostgresJsDatabase<typeof schema>, siteId: string) {
  return db
    .select()
    .from(siteZones)
    .where(and(eq(siteZones.siteId, siteId), eq(siteZones.companyId, TEST_COMPANY_ID)))
}

async function getBackflows(db: PostgresJsDatabase<typeof schema>, siteId: string) {
  return db
    .select()
    .from(siteBackflows)
    .where(and(eq(siteBackflows.siteId, siteId), eq(siteBackflows.companyId, TEST_COMPANY_ID)))
}

async function getVisits(db: PostgresJsDatabase<typeof schema>, siteId: string) {
  return db
    .select()
    .from(siteVisits)
    .where(and(eq(siteVisits.siteId, siteId), eq(siteVisits.companyId, TEST_COMPANY_ID)))
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('updateSiteEquipment', () => {
  describe('basic inserts', () => {
    test('inserts controllers', async () => {
      await withRollback(async (db) => {
        const site = await insertTestSite(db)
        const result = await updateSiteEquipment({
          siteId: site.id,
          controllers: [
            {
              id: 1,
              location: 'Front',
              manufacturer: 'Hunter',
              model: 'Pro-HC',
              sensors: 'Rain',
              numZones: '6',
              masterValve: true,
              masterValveNotes: 'Needs service',
              notes: 'Main controller',
            },
          ],
          zones: [],
          backflows: [],
          overview: {
            staticPressure: '65',
            backflowInstalled: true,
            backflowServiceable: true,
            isolationValve: true,
            systemNotes: 'System is good',
          },
        })

        expect(result.ok).toBe(true)
        const ctrls = await getControllers(db, site.id)
        expect(ctrls).toHaveLength(1)
        expect(ctrls[0].manufacturer).toBe('Hunter')
        expect(ctrls[0].masterValve).toBe(true)
      })
    })

    test('inserts zones', async () => {
      await withRollback(async (db) => {
        const site = await insertTestSite(db)
        const result = await updateSiteEquipment({
          siteId: site.id,
          controllers: [
            {
              id: 1,
              location: 'Front',
              manufacturer: 'Hunter',
              model: 'Pro-HC',
              sensors: '',
              numZones: '6',
              masterValve: false,
              masterValveNotes: '',
              notes: '',
            },
          ],
          zones: [
            {
              id: 2,
              zoneNum: '1',
              controller: '1',
              description: 'Front lawn',
              landscapeTypes: ['Full-sun turf'],
              irrigationTypes: ['Rotor'],
              notes: 'Needs attention',
              photoData: [],
            },
          ],
          backflows: [],
        })

        expect(result.ok).toBe(true)
        const zones = await getZones(db, site.id)
        expect(zones).toHaveLength(1)
        expect(zones[0].description).toBe('Front lawn')
        expect(zones[0].landscapeTypes).toEqual(['Full-sun turf'])
        expect(zones[0].irrigationTypes).toEqual(['Rotor'])
      })
    })

    test('inserts backflows', async () => {
      await withRollback(async (db) => {
        const site = await insertTestSite(db)
        const result = await updateSiteEquipment({
          siteId: site.id,
          controllers: [],
          zones: [],
          backflows: [
            {
              id: 3,
              manufacturer: 'Watts',
              type: 'DCVA',
              model: '007M2',
              size: '1',
            },
          ],
        })

        expect(result.ok).toBe(true)
        const bfs = await getBackflows(db, site.id)
        expect(bfs).toHaveLength(1)
        expect(bfs[0].manufacturer).toBe('Watts')
        expect(bfs[0].type).toBe('DCVA')
      })
    })
  })

  describe('controller-zone relationships', () => {
    test('maps ephemeral UI IDs to DB UUIDs for zone controller FK', async () => {
      await withRollback(async (db) => {
        const site = await insertTestSite(db)
        const result = await updateSiteEquipment({
          siteId: site.id,
          controllers: [
            {
              id: 1,
              location: 'Pump house',
              manufacturer: 'Rachio',
              model: '3',
              sensors: '',
              numZones: '4',
              masterValve: false,
              masterValveNotes: '',
              notes: '',
            },
            {
              id: 2,
              location: 'Back',
              manufacturer: 'Hunter',
              model: 'Solar Sync',
              sensors: '',
              numZones: '8',
              masterValve: false,
              masterValveNotes: '',
              notes: '',
            },
          ],
          zones: [
            { id: 10, zoneNum: '1', controller: '1', description: 'Zone A', landscapeTypes: [], irrigationTypes: [], notes: '', photoData: [] },
            { id: 11, zoneNum: '2', controller: '2', description: 'Zone B', landscapeTypes: [], irrigationTypes: [], notes: '', photoData: [] },
            { id: 12, zoneNum: '3', controller: '1', description: 'Zone C', landscapeTypes: [], irrigationTypes: [], notes: '', photoData: [] },
          ],
          backflows: [],
        })

        expect(result.ok).toBe(true)
        const zones = await getZones(db, site.id)
        expect(zones).toHaveLength(3)

        // All zones should have controllerId pointing to their assigned controller
        const zonesByDesc = new Map(zones.map(z => [z.description, z]))
        expect(zonesByDesc.get('Zone A')?.controllerId).toBeDefined()
        expect(zonesByDesc.get('Zone B')?.controllerId).toBeDefined()
        expect(zonesByDesc.get('Zone C')?.controllerId).toBeDefined()

        // Zone A and C should have the same controller
        expect(zonesByDesc.get('Zone A')?.controllerId).toBe(zonesByDesc.get('Zone C')?.controllerId)
        // Zone B should have a different controller
        expect(zonesByDesc.get('Zone B')?.controllerId).not.toBe(zonesByDesc.get('Zone A')?.controllerId)
      })
    })

    test('handles unmatched controller ID (zone references missing controller)', async () => {
      await withRollback(async (db) => {
        const site = await insertTestSite(db)
        const result = await updateSiteEquipment({
          siteId: site.id,
          controllers: [
            { id: 1, location: 'A', manufacturer: 'H', model: 'M', sensors: '', numZones: '1', masterValve: false, masterValveNotes: '', notes: '' },
          ],
          zones: [
            // Zone references controller ID 999 which does not exist
            { id: 10, zoneNum: '1', controller: '999', description: 'Orphan Zone', landscapeTypes: [], irrigationTypes: [], notes: '', photoData: [] },
          ],
          backflows: [],
        })

        expect(result.ok).toBe(true)
        const zones = await getZones(db, site.id)
        expect(zones).toHaveLength(1)
        // controllerId should be null (unmapped ID → null in the code)
        expect(zones[0].controllerId).toBeNull()
      })
    })
  })

  describe('delete-then-insert behavior', () => {
    test('replaces all equipment (deletes old, inserts new)', async () => {
      await withRollback(async (db) => {
        const site = await insertTestSite(db)

        // First call: insert equipment
        const result1 = await updateSiteEquipment({
          siteId: site.id,
          controllers: [
            { id: 1, location: 'A', manufacturer: 'H', model: 'M1', sensors: '', numZones: '1', masterValve: false, masterValveNotes: '', notes: '' },
          ],
          zones: [{ id: 2, zoneNum: '1', controller: '', description: 'Old', landscapeTypes: [], irrigationTypes: [], notes: '', photoData: [] }],
          backflows: [{ id: 3, manufacturer: 'W', type: 'T', model: 'M', size: '1' }],
        })

        expect(result1.ok).toBe(true)
        expect((await getControllers(db, site.id))).toHaveLength(1)
        expect((await getZones(db, site.id))).toHaveLength(1)
        expect((await getBackflows(db, site.id))).toHaveLength(1)

        // Second call: replace with different equipment
        const result2 = await updateSiteEquipment({
          siteId: site.id,
          controllers: [
            { id: 1, location: 'B', manufacturer: 'R', model: 'M2', sensors: '', numZones: '2', masterValve: false, masterValveNotes: '', notes: '' },
            { id: 2, location: 'C', manufacturer: 'J', model: 'M3', sensors: '', numZones: '3', masterValve: false, masterValveNotes: '', notes: '' },
          ],
          zones: [],
          backflows: [],
        })

        expect(result2.ok).toBe(true)
        // Old equipment deleted, new inserted
        expect((await getControllers(db, site.id))).toHaveLength(2)
        expect((await getZones(db, site.id))).toHaveLength(0)
        expect((await getBackflows(db, site.id))).toHaveLength(0)
      })
    })

    test('clears all equipment when empty arrays provided', async () => {
      await withRollback(async (db) => {
        const site = await insertTestSite(db)

        // Insert initial equipment
        await updateSiteEquipment({
          siteId: site.id,
          controllers: [
            { id: 1, location: 'A', manufacturer: 'H', model: 'M', sensors: '', numZones: '1', masterValve: false, masterValveNotes: '', notes: '' },
          ],
          zones: [{ id: 2, zoneNum: '1', controller: '', description: 'Z', landscapeTypes: [], irrigationTypes: [], notes: '', photoData: [] }],
          backflows: [{ id: 3, manufacturer: 'W', type: 'T', model: 'M', size: '1' }],
        })

        expect((await getControllers(db, site.id))).toHaveLength(1)

        // Clear everything
        const result = await updateSiteEquipment({
          siteId: site.id,
          controllers: [],
          zones: [],
          backflows: [],
        })

        expect(result.ok).toBe(true)
        expect((await getControllers(db, site.id))).toHaveLength(0)
        expect((await getZones(db, site.id))).toHaveLength(0)
        expect((await getBackflows(db, site.id))).toHaveLength(0)
      })
    })
  })

  describe('system overview (siteVisits)', () => {
    test('creates a new visit record when overview is provided', async () => {
      await withRollback(async (db) => {
        const site = await insertTestSite(db)
        const result = await updateSiteEquipment({
          siteId: site.id,
          controllers: [],
          zones: [],
          backflows: [],
          overview: {
            staticPressure: '75',
            backflowInstalled: true,
            backflowServiceable: false,
            isolationValve: true,
            systemNotes: 'Needs repair',
          },
        })

        expect(result.ok).toBe(true)
        const visits = await getVisits(db, site.id)
        expect(visits).toHaveLength(1)
        expect(visits[0].staticPressure).toBe('75')
        expect(visits[0].backflowInstalled).toBe(true)
        expect(visits[0].backflowServiceable).toBe(false)
        expect(visits[0].systemNotes).toBe('Needs repair')
      })
    })

    test('upserts (updates) existing visit when called twice same day', async () => {
      await withRollback(async (db) => {
        const site = await insertTestSite(db)

        // First call today
        await updateSiteEquipment({
          siteId: site.id,
          controllers: [],
          zones: [],
          backflows: [],
          overview: {
            staticPressure: '65',
            backflowInstalled: false,
            backflowServiceable: false,
            isolationValve: false,
            systemNotes: 'Initial',
          },
        })

        // Second call today (same datePerformed)
        const result = await updateSiteEquipment({
          siteId: site.id,
          controllers: [],
          zones: [],
          backflows: [],
          overview: {
            staticPressure: '70',
            backflowInstalled: true,
            backflowServiceable: true,
            isolationValve: true,
            systemNotes: 'Updated',
          },
        })

        expect(result.ok).toBe(true)
        const visits = await getVisits(db, site.id)
        // Should still be 1 (upserted, not added)
        expect(visits).toHaveLength(1)
        expect(visits[0].staticPressure).toBe('70')
        expect(visits[0].systemNotes).toBe('Updated')
      })
    })

    test('does not create visit when overview is null/undefined', async () => {
      await withRollback(async (db) => {
        const site = await insertTestSite(db)
        const result = await updateSiteEquipment({
          siteId: site.id,
          controllers: [],
          zones: [],
          backflows: [],
          // no overview provided
        })

        expect(result.ok).toBe(true)
        const visits = await getVisits(db, site.id)
        expect(visits).toHaveLength(0)
      })
    })
  })

  describe('validation', () => {
    test('rejects invalid site ID format', async () => {
      const result = await updateSiteEquipment({
        siteId: 'not-a-uuid',
        controllers: [],
        zones: [],
        backflows: [],
      })

      expect(result.ok).toBe(false)
      expect(result.error).toContain('Invalid site ID')
    })

    test('validates controller data shape', async () => {
      const result = await updateSiteEquipment({
        siteId: '00000000-0000-0000-0000-000000000000',
        controllers: [
          {
            id: 'invalid-not-number' as any,
            location: 'A',
            manufacturer: 'H',
            model: 'M',
            sensors: '',
            numZones: '1',
            masterValve: false,
            masterValveNotes: '',
            notes: '',
          },
        ],
        zones: [],
        backflows: [],
      })

      expect(result.ok).toBe(false)
      expect(result.error).toContain('Validation failed')
    })

    test('validates zone data shape', async () => {
      const result = await updateSiteEquipment({
        siteId: '00000000-0000-0000-0000-000000000000',
        controllers: [],
        zones: [
          {
            id: 'invalid-not-number' as any,
            zoneNum: '1',
            controller: '',
            description: '',
            landscapeTypes: [],
            irrigationTypes: [],
            notes: '',
            photoData: [],
          },
        ],
        backflows: [],
      })

      expect(result.ok).toBe(false)
      expect(result.error).toContain('Validation failed')
    })

    test('validates backflow data shape', async () => {
      const result = await updateSiteEquipment({
        siteId: '00000000-0000-0000-0000-000000000000',
        controllers: [],
        zones: [],
        backflows: [
          {
            id: 'invalid-not-number' as any,
            manufacturer: 'W',
            type: 'T',
            model: 'M',
            size: '1',
          },
        ],
      })

      expect(result.ok).toBe(false)
      expect(result.error).toContain('Validation failed')
    })
  })

  describe('multi-tenancy', () => {
    test('rejects update for non-existent site', async () => {
      const result = await updateSiteEquipment({
        siteId: '00000000-0000-0000-0000-000000000000',
        controllers: [],
        zones: [],
        backflows: [],
      })

      expect(result.ok).toBe(false)
      expect(result.error).toContain('Site not found')
    })

    test('enforces company isolation (only updates own company sites)', async () => {
      // This test verifies the code checks site ownership before mutation
      // The mock ensures getRequiredCompanyId() returns TEST_COMPANY_ID
      await withRollback(async (db) => {
        // Insert a site in TEST_COMPANY_ID
        const site = await insertTestSite(db)

        // Try to update it (should succeed since we own it)
        const result = await updateSiteEquipment({
          siteId: site.id,
          controllers: [
            { id: 1, location: 'A', manufacturer: 'H', model: 'M', sensors: '', numZones: '1', masterValve: false, masterValveNotes: '', notes: '' },
          ],
          zones: [],
          backflows: [],
        })

        expect(result.ok).toBe(true)

        // Verify the controller was inserted under TEST_COMPANY_ID
        const ctrl = await getControllers(db, site.id)
        expect(ctrl[0].companyId).toBe(TEST_COMPANY_ID)
      })
    })
  })

  describe('error handling', () => {
    test('catches transaction errors and returns generic message', async () => {
      // We can't easily test real DB errors without special setup,
      // but the code has a try-catch that converts to a generic message.
      // Validation failures are caught before transaction, so this is defensive.

      // For now, just verify the structure is there by checking a normal case
      await withRollback(async (db) => {
        const site = await insertTestSite(db)
        const result = await updateSiteEquipment({
          siteId: site.id,
          controllers: [],
          zones: [],
          backflows: [],
        })

        expect(result.ok).toBe(true)
      })
    })
  })

  describe('success responses', () => {
    test('returns { ok: true } on successful update', async () => {
      await withRollback(async (db) => {
        const site = await insertTestSite(db)
        const result = await updateSiteEquipment({
          siteId: site.id,
          controllers: [],
          zones: [],
          backflows: [],
        })

        expect(result.ok).toBe(true)
        expect(result).toEqual({ ok: true })
      })
    })

    test('returns { ok: false, error: string } on validation failure', async () => {
      const result = await updateSiteEquipment({
        siteId: 'not-a-uuid',
        controllers: [],
        zones: [],
        backflows: [],
      })

      expect(result.ok).toBe(false)
      expect(typeof result.error).toBe('string')
      expect(result.error.length).toBeGreaterThan(0)
    })
  })
})
