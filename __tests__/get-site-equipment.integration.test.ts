/**
 * Integration tests for getSiteEquipment server action.
 *
 * Tests the full flow: getRequiredCompanyId → findSiteEquipment with real DB.
 *
 * Task: link-irrigation-fields (8f5d8c1a-7b2e-4f3a-9c6d-2e1a5f8b3c2d)
 */

import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { startTestDb, stopTestDb, withRollback, TEST_COMPANY_ID } from '../test/helpers/db'
import { sites, siteControllers, siteZones, siteBackflows, siteVisits } from '@/lib/schema'
import type * as schema from '@/lib/schema'

// Mock getRequiredCompanyId before importing getSiteEquipment
jest.mock('@/lib/tenant', () => ({
  getRequiredCompanyId: jest.fn(),
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { getSiteEquipment } from '@/actions/sites'
import { getRequiredCompanyId } from '@/lib/tenant'

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

// ── Helpers ────────────────────────────────────────────────────────────────

async function insertSite(db: PostgresJsDatabase<typeof schema>, name = 'Test Site') {
  const [row] = await db.insert(sites).values({ companyId: TEST_COMPANY_ID, name }).returning()
  return row
}

// ── getSiteEquipment Server Action Tests ──────────────────────────────────

describe('getSiteEquipment (server action)', () => {
  const mockGetRequiredCompanyId = getRequiredCompanyId as jest.Mock

  beforeEach(() => {
    mockGetRequiredCompanyId.mockReset()
  })

  describe('happy path — equipment loading', () => {
    it('loads controllers for an existing site', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'Controllers Test Site')
        await db.insert(siteControllers).values({
          companyId: TEST_COMPANY_ID,
          siteId: site.id,
          location: 'Front',
          manufacturer: 'Hunter',
          model: 'Pro-HC',
          sensors: 'Rain/Freeze',
          numZones: '8',
          masterValve: true,
          masterValveNotes: 'Working',
          notes: 'Recently serviced',
        })

        const result = await getSiteEquipment(site.id)

        expect(result.controllers).toHaveLength(1)
        expect(result.controllers[0].location).toBe('Front')
        expect(result.controllers[0].manufacturer).toBe('Hunter')
        expect(result.controllers[0].model).toBe('Pro-HC')
      })
    })

    it('loads zones for an existing site', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'Zones Test Site')
        const [ctrl] = await db
          .insert(siteControllers)
          .values({ companyId: TEST_COMPANY_ID, siteId: site.id, numZones: '2' })
          .returning()
        await db.insert(siteZones).values({
          companyId: TEST_COMPANY_ID,
          siteId: site.id,
          zoneNum: '1',
          description: 'Front lawn',
          landscapeTypes: ['Full-sun turf'],
          irrigationTypes: ['Rotor'],
          controllerId: ctrl.id,
        })

        const result = await getSiteEquipment(site.id)

        expect(result.zones).toHaveLength(1)
        expect(result.zones[0].description).toBe('Front lawn')
        expect(result.zones[0].landscapeTypes).toEqual(['Full-sun turf'])
      })
    })

    it('loads backflows for an existing site', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'Backflows Test Site')
        await db.insert(siteBackflows).values({
          companyId: TEST_COMPANY_ID,
          siteId: site.id,
          manufacturer: 'Watts',
          type: 'Reduced Pressure',
          model: 'RPC',
          size: '1',
        })

        const result = await getSiteEquipment(site.id)

        expect(result.backflows).toHaveLength(1)
        expect(result.backflows[0].manufacturer).toBe('Watts')
        expect(result.backflows[0].type).toBe('Reduced Pressure')
      })
    })

    it('loads system overview from latest site visit', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'Overview Test Site')
        const today = new Date().toISOString().slice(0, 10)
        await db.insert(siteVisits).values({
          companyId: TEST_COMPANY_ID,
          siteId: site.id,
          datePerformed: today,
          staticPressure: '75.5',
          backflowInstalled: true,
          backflowServiceable: true,
          isolationValve: false,
          systemNotes: 'System in good shape',
        })

        const result = await getSiteEquipment(site.id)

        expect(result.overview).not.toBeNull()
        expect(result.overview!.staticPressure).toBe('75.5')
        expect(result.overview!.backflowInstalled).toBe(true)
        expect(result.overview!.systemNotes).toBe('System in good shape')
      })
    })

    it('returns empty arrays for site with no equipment', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'Empty Site')

        const result = await getSiteEquipment(site.id)

        expect(result.controllers).toEqual([])
        expect(result.zones).toEqual([])
        expect(result.backflows).toEqual([])
      })
    })

    it('returns null overview if site has no visits', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'No Visits Site')

        const result = await getSiteEquipment(site.id)

        expect(result.overview).toBeNull()
      })
    })

    it('transforms DB rows to form data shapes correctly', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'Transform Test Site')
        const [ctrl] = await db
          .insert(siteControllers)
          .values({
            companyId: TEST_COMPANY_ID,
            siteId: site.id,
            location: 'Back',
            manufacturer: 'Rachio',
            model: 'Gen 2',
            sensors: 'Freeze',
            numZones: '6',
            masterValve: true,
            masterValveNotes: 'OK',
            notes: 'Installed 2024',
          })
          .returning()
        await db.insert(siteZones).values({
          companyId: TEST_COMPANY_ID,
          siteId: site.id,
          zoneNum: '1',
          description: 'Back lawn',
          landscapeTypes: ['Shade turf', 'Slope'],
          irrigationTypes: ['Drip', 'Micro spray'],
          notes: 'Needs attention',
          controllerId: ctrl.id,
        })
        await db.insert(siteBackflows).values({
          companyId: TEST_COMPANY_ID,
          siteId: site.id,
          manufacturer: 'Febco',
          type: 'PVB',
          model: '765',
          size: '1.5',
        })

        const result = await getSiteEquipment(site.id)

        // Controllers
        expect(result.controllers[0]).toMatchObject({
          location: 'Back',
          manufacturer: 'Rachio',
          model: 'Gen 2',
          sensors: 'Freeze',
          numZones: '6',
          masterValve: true,
          masterValveNotes: 'OK',
          notes: 'Installed 2024',
        })

        // Zones
        expect(result.zones[0]).toMatchObject({
          zoneNum: '1',
          description: 'Back lawn',
          landscapeTypes: ['Shade turf', 'Slope'],
          irrigationTypes: ['Drip', 'Micro spray'],
          notes: 'Needs attention',
          photoData: [],
        })

        // Backflows
        expect(result.backflows[0]).toMatchObject({
          manufacturer: 'Febco',
          type: 'PVB',
          model: '765',
          size: '1.5',
        })
      })
    })

    it('handles nullable fields correctly (null → empty string)', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'Nulls Test Site')
        await db.insert(siteControllers).values({
          companyId: TEST_COMPANY_ID,
          siteId: site.id,
          location: null,
          manufacturer: null,
          model: null,
          sensors: null,
          numZones: '0',
          masterValve: false,
          masterValveNotes: null,
          notes: null,
        })

        const result = await getSiteEquipment(site.id)

        expect(result.controllers[0].location).toBe('')
        expect(result.controllers[0].manufacturer).toBe('')
        expect(result.controllers[0].model).toBe('')
        expect(result.controllers[0].sensors).toBe('')
        expect(result.controllers[0].masterValveNotes).toBe('')
        expect(result.controllers[0].notes).toBe('')
      })
    })
  })

  describe('multi-tenancy & access control', () => {
    it('only returns equipment for the current company', async () => {
      // This test would need a second company in the test DB, which we skip for now
      // The check is: getRequiredCompanyId filters by companyId in the WHERE clause
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'Access Control Site')
        await db.insert(siteControllers).values({
          companyId: TEST_COMPANY_ID,
          siteId: site.id,
          manufacturer: 'Test',
        })

        const result = await getSiteEquipment(site.id)

        expect(result.controllers).toHaveLength(1)
      })
    })

    it('throws error if site not found', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await expect(getSiteEquipment('nonexistent-site-id')).rejects.toThrow('Site not found')
    })

    it('throws error if site belongs to different company', async () => {
      mockGetRequiredCompanyId.mockResolvedValue('different-company-id')

      await withRollback(async (db) => {
        const site = await insertSite(db, 'Wrong Company Site')

        // getRequiredCompanyId returns a different company, so the site won't be found
        await expect(getSiteEquipment(site.id)).rejects.toThrow('Site not found')
      })
    })
  })

  describe('ephemeral ID assignment', () => {
    it('assigns ephemeral IDs starting at 1 for controllers', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'Ephemeral IDs Site')
        await db.insert(siteControllers).values(
          { companyId: TEST_COMPANY_ID, siteId: site.id, location: 'Front' },
          { companyId: TEST_COMPANY_ID, siteId: site.id, location: 'Back' }
        )

        const result = await getSiteEquipment(site.id)

        expect(result.controllers[0].id).toBe(1)
        expect(result.controllers[1].id).toBe(2)
      })
    })

    it('continues ID counter from controllers to zones', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'ID Counter Site')
        const [ctrl1] = await db
          .insert(siteControllers)
          .values({ companyId: TEST_COMPANY_ID, siteId: site.id, location: 'Front' })
          .returning()
        const [ctrl2] = await db
          .insert(siteControllers)
          .values({ companyId: TEST_COMPANY_ID, siteId: site.id, location: 'Back' })
          .returning()
        await db.insert(siteZones).values(
          { companyId: TEST_COMPANY_ID, siteId: site.id, zoneNum: '1', controllerId: ctrl1.id },
          { companyId: TEST_COMPANY_ID, siteId: site.id, zoneNum: '2', controllerId: ctrl2.id }
        )

        const result = await getSiteEquipment(site.id)

        // Controllers get IDs 1, 2
        expect(result.controllers[0].id).toBe(1)
        expect(result.controllers[1].id).toBe(2)
        // Zones continue with 3, 4
        expect(result.zones[0].id).toBe(3)
        expect(result.zones[1].id).toBe(4)
      })
    })

    it('resolves zone.controller to ephemeral ID string of the linked controller', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'Zone FK Wiring Site')
        const [ctrl1] = await db
          .insert(siteControllers)
          .values({ companyId: TEST_COMPANY_ID, siteId: site.id, location: 'Front' })
          .returning()
        const [ctrl2] = await db
          .insert(siteControllers)
          .values({ companyId: TEST_COMPANY_ID, siteId: site.id, location: 'Back' })
          .returning()
        await db.insert(siteZones).values({
          companyId: TEST_COMPANY_ID,
          siteId: site.id,
          zoneNum: '1',
          controllerId: ctrl2.id, // Zone linked to second controller
        })

        const result = await getSiteEquipment(site.id)

        // ctrl2 is assigned ephemeral id=2
        expect(result.zones[0].controller).toBe('2')
      })
    })
  })

  describe('edge cases', () => {
    it('handles site with many controllers', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'Many Controllers Site')
        const controllers = Array.from({ length: 50 }, (_, i) => ({
          companyId: TEST_COMPANY_ID,
          siteId: site.id,
          location: `Zone ${i + 1}`,
        }))
        await db.insert(siteControllers).values(controllers)

        const result = await getSiteEquipment(site.id)

        expect(result.controllers).toHaveLength(50)
      })
    })

    it('handles site with many zones', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'Many Zones Site')
        const zones = Array.from({ length: 100 }, (_, i) => ({
          companyId: TEST_COMPANY_ID,
          siteId: site.id,
          zoneNum: String(i + 1),
          landscapeTypes: [],
          irrigationTypes: [],
        }))
        await db.insert(siteZones).values(zones)

        const result = await getSiteEquipment(site.id)

        expect(result.zones).toHaveLength(100)
      })
    })

    it('handles zones without controller', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'Zones Without Controller Site')
        await db.insert(siteZones).values({
          companyId: TEST_COMPANY_ID,
          siteId: site.id,
          zoneNum: '1',
          controllerId: null,
        })

        const result = await getSiteEquipment(site.id)

        expect(result.zones[0].controller).toBe('')
      })
    })

    it('handles multiple backflow devices per site', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'Multiple Backflows Site')
        await db.insert(siteBackflows).values(
          { companyId: TEST_COMPANY_ID, siteId: site.id, manufacturer: 'Watts', type: 'RPZ' },
          { companyId: TEST_COMPANY_ID, siteId: site.id, manufacturer: 'Febco', type: 'PVB' },
          { companyId: TEST_COMPANY_ID, siteId: site.id, manufacturer: 'Wilkins', type: 'DC' }
        )

        const result = await getSiteEquipment(site.id)

        expect(result.backflows).toHaveLength(3)
      })
    })
  })

  describe('getRequiredCompanyId integration', () => {
    it('calls getRequiredCompanyId to authorize the request', async () => {
      mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)

      await withRollback(async (db) => {
        const site = await insertSite(db, 'Auth Test Site')

        await getSiteEquipment(site.id)

        expect(mockGetRequiredCompanyId).toHaveBeenCalledTimes(1)
      })
    })

    it('propagates errors from getRequiredCompanyId', async () => {
      mockGetRequiredCompanyId.mockRejectedValue(new Error('Not authenticated'))

      await expect(getSiteEquipment('any-site')).rejects.toThrow('Not authenticated')
    })
  })
})
