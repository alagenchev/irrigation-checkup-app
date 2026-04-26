/**
 * Unit tests for findSiteEquipment and getSiteEquipment.
 *
 * findSiteEquipment is a pure function that accepts an injected dbClient —
 * we inject a mock db object and never touch a real database.
 *
 * getSiteEquipment is the Server Action wrapper — we mock getRequiredCompanyId
 * and spy on findSiteEquipment to verify the plumbing.
 *
 * Task: link-irrigation-fields (8f5d8c1a-7b2e-4f3a-9c6d-2e1a5f8b3c2d)
 */

// ── Mock 'server-only' so the 'use server' module can be imported in tests ────
jest.mock('server-only', () => ({}), { virtual: true })

// ── Mock next/cache so revalidatePath doesn't blow up ─────────────────────────
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

// ── Mock @/lib/db so the module-level `db` import doesn't connect to postgres ──
jest.mock('@/lib/db', () => ({ db: {} }))

// ── Mock @/lib/tenant for getSiteEquipment wrapper tests ──────────────────────
jest.mock('@/lib/tenant', () => ({
  getRequiredCompanyId: jest.fn(),
}))

import { findSiteEquipment, getSiteEquipment } from '@/actions/sites'
import { getRequiredCompanyId } from '@/lib/tenant'

// ── Shared constants ──────────────────────────────────────────────────────────

const COMPANY_ID = 'company-uuid-1'
const SITE_ID    = 'site-uuid-abc'
const CTRL_UUID  = 'ctrl-uuid-001'
const CTRL_UUID2 = 'ctrl-uuid-002'
const ZONE_UUID  = 'zone-uuid-001'
const ZONE_UUID2 = 'zone-uuid-002'
const BF_UUID    = 'bf-uuid-001'

// ── DB mock factory ───────────────────────────────────────────────────────────
//
// findSiteEquipment does:
//   1. dbClient.select().from(sites).where().limit(1)     → siteRow check
//   2. Promise.all([
//        dbClient.select().from(siteControllers).where().orderBy()
//        dbClient.select().from(siteZones).where().orderBy()
//        dbClient.select().from(siteBackflows).where().orderBy()
//        dbClient.select().from(siteVisits).where().orderBy().limit(1)
//      ])
//
// We model this with a chainable mock that returns a configured result when
// the terminal method (limit, orderBy) is called.

type SelectChain = {
  from: jest.Mock
  where: jest.Mock
  limit: jest.Mock
  orderBy: jest.Mock
}

function makeSelectChain(resolvedValue: unknown): SelectChain {
  const chain: SelectChain = {
    from:    jest.fn(),
    where:   jest.fn(),
    limit:   jest.fn(),
    orderBy: jest.fn(),
  }
  // Each method returns the same chain for chaining, except terminal ones
  chain.from.mockReturnValue(chain)
  chain.where.mockReturnValue(chain)
  chain.orderBy.mockReturnValue(chain)
  chain.limit.mockReturnValue(Promise.resolve(resolvedValue))
  // orderBy is also terminal for the siteControllers/zones/backflows queries
  // (they don't call .limit after .orderBy)
  chain.orderBy.mockReturnValue(Promise.resolve(resolvedValue))
  return chain
}

/**
 * Build a mock dbClient that drives findSiteEquipment's queries.
 *
 * The function makes exactly 5 db.select() calls:
 *   0: site existence check      → siteCheckResult
 *   1: siteControllers query      → controllers
 *   2: siteZones query            → zones
 *   3: siteBackflows query        → backflows
 *   4: siteVisits query (latest)  → visits
 *
 * Promise.all calls selects 1-4 in parallel; we must return the right result
 * per call index.
 */
function buildMockDb(opts: {
  siteCheckResult: unknown[]
  controllers?: unknown[]
  zones?: unknown[]
  backflows?: unknown[]
  visits?: unknown[]
}) {
  const {
    siteCheckResult,
    controllers = [],
    zones       = [],
    backflows   = [],
    visits      = [],
  } = opts

  // Call 0: site check → uses .limit(1)
  const siteChain = makeSelectChain(siteCheckResult)

  // Calls 1-4 are inside Promise.all, done with orderBy as terminal
  const ctrlChain = makeSelectChain(controllers)
  const zoneChain = makeSelectChain(zones)
  const bfChain   = makeSelectChain(backflows)
  const visitChain = makeSelectChain(visits)
  // visitChain uses .orderBy().limit(), so fix orderBy to return chain and limit to resolve
  visitChain.orderBy.mockReturnValue(visitChain)
  visitChain.limit.mockReturnValue(Promise.resolve(visits))

  let callIndex = 0
  const selectMock = jest.fn(() => {
    const result = [siteChain, ctrlChain, zoneChain, bfChain, visitChain][callIndex]
    callIndex++
    return result
  })

  return { select: selectMock } as unknown as Parameters<typeof findSiteEquipment>[2]
}

// ─────────────────────────────────────────────────────────────────────────────
// findSiteEquipment — pure unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe('findSiteEquipment()', () => {

  // ── Site-not-found guard ───────────────────────────────────────────────────

  describe('site not found', () => {
    it('throws "Site not found" when siteRow query returns empty array', async () => {
      const mockDb = buildMockDb({ siteCheckResult: [] })
      await expect(findSiteEquipment(SITE_ID, COMPANY_ID, mockDb))
        .rejects.toThrow('Site not found')
    })

    it('throws even when COMPANY_ID does not match the site', async () => {
      // Simulated by returning empty (DB would also return empty if companyId ≠ site.companyId)
      const mockDb = buildMockDb({ siteCheckResult: [] })
      await expect(findSiteEquipment(SITE_ID, 'wrong-company', mockDb))
        .rejects.toThrow('Site not found')
    })
  })

  // ── Empty-results happy path ───────────────────────────────────────────────

  describe('empty site (no equipment, no visits)', () => {
    it('returns empty arrays and null overview for a site with no equipment', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        controllers:     [],
        zones:           [],
        backflows:       [],
        visits:          [],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)

      expect(result.controllers).toEqual([])
      expect(result.zones).toEqual([])
      expect(result.backflows).toEqual([])
      expect(result.overview).toBeNull()
    })

    it('returns null overview when there are no site visits', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        visits:          [],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      expect(result.overview).toBeNull()
    })
  })

  // ── Controllers ───────────────────────────────────────────────────────────

  describe('controllers', () => {
    it('maps a controller row to ControllerFormData shape', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        controllers: [{
          id:               CTRL_UUID,
          location:         'Front',
          manufacturer:     'Hunter',
          model:            'Pro-HC',
          sensors:          'Rain/Freeze',
          numZones:         '8',
          masterValve:      true,
          masterValveNotes: 'Working fine',
          notes:            'Installed 2024',
        }],
      })

      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)

      expect(result.controllers).toHaveLength(1)
      const c = result.controllers[0]
      expect(c.location).toBe('Front')
      expect(c.manufacturer).toBe('Hunter')
      expect(c.model).toBe('Pro-HC')
      expect(c.sensors).toBe('Rain/Freeze')
      expect(c.numZones).toBe('8')
      expect(c.masterValve).toBe(true)
      expect(c.masterValveNotes).toBe('Working fine')
      expect(c.notes).toBe('Installed 2024')
    })

    it('assigns ephemeral integer id starting at 1', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        controllers: [
          { id: CTRL_UUID,  location: null, manufacturer: null, model: null, sensors: null, numZones: '0', masterValve: false, masterValveNotes: null, notes: null },
          { id: CTRL_UUID2, location: null, manufacturer: null, model: null, sensors: null, numZones: '0', masterValve: false, masterValveNotes: null, notes: null },
        ],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      expect(result.controllers[0].id).toBe(1)
      expect(result.controllers[1].id).toBe(2)
    })

    it('converts null nullable fields to empty strings', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        controllers: [{
          id:               CTRL_UUID,
          location:         null,
          manufacturer:     null,
          model:            null,
          sensors:          null,
          numZones:         '0',
          masterValve:      false,
          masterValveNotes: null,
          notes:            null,
        }],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      const c = result.controllers[0]
      expect(c.location).toBe('')
      expect(c.manufacturer).toBe('')
      expect(c.model).toBe('')
      expect(c.sensors).toBe('')
      expect(c.masterValveNotes).toBe('')
      expect(c.notes).toBe('')
    })

    it('handles a site with no controllers (empty array)', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        controllers: [],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      expect(result.controllers).toEqual([])
    })
  })

  // ── Zones ─────────────────────────────────────────────────────────────────

  describe('zones', () => {
    it('maps a zone row to ZoneFormData shape', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        controllers: [{ id: CTRL_UUID, location: null, manufacturer: null, model: null, sensors: null, numZones: '0', masterValve: false, masterValveNotes: null, notes: null }],
        zones: [{
          id:              ZONE_UUID,
          zoneNum:         '1',
          controllerId:    CTRL_UUID,
          description:     'Front lawn',
          landscapeTypes:  ['Full-sun turf'],
          irrigationTypes: ['Rotor'],
          notes:           'Needs attention',
        }],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)

      expect(result.zones).toHaveLength(1)
      const z = result.zones[0]
      expect(z.zoneNum).toBe('1')
      expect(z.description).toBe('Front lawn')
      expect(z.landscapeTypes).toEqual(['Full-sun turf'])
      expect(z.irrigationTypes).toEqual(['Rotor'])
      expect(z.notes).toBe('Needs attention')
      expect(z.photoData).toEqual([])
    })

    it('assigns ephemeral IDs continuing from controllers (not re-starting at 1)', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        controllers: [
          { id: CTRL_UUID,  location: null, manufacturer: null, model: null, sensors: null, numZones: '0', masterValve: false, masterValveNotes: null, notes: null },
          { id: CTRL_UUID2, location: null, manufacturer: null, model: null, sensors: null, numZones: '0', masterValve: false, masterValveNotes: null, notes: null },
        ],
        zones: [
          { id: ZONE_UUID,  zoneNum: '1', controllerId: null, description: null, landscapeTypes: null, irrigationTypes: null, notes: null },
          { id: ZONE_UUID2, zoneNum: '2', controllerId: null, description: null, landscapeTypes: null, irrigationTypes: null, notes: null },
        ],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      // controllers get IDs 1, 2 — zones continue with 3, 4
      expect(result.controllers[0].id).toBe(1)
      expect(result.controllers[1].id).toBe(2)
      expect(result.zones[0].id).toBe(3)
      expect(result.zones[1].id).toBe(4)
    })

    it('resolves zone.controller to ephemeral ID string of the linked controller', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        controllers: [
          { id: CTRL_UUID,  location: null, manufacturer: null, model: null, sensors: null, numZones: '0', masterValve: false, masterValveNotes: null, notes: null },
          { id: CTRL_UUID2, location: null, manufacturer: null, model: null, sensors: null, numZones: '0', masterValve: false, masterValveNotes: null, notes: null },
        ],
        zones: [{
          id:              ZONE_UUID,
          zoneNum:         '1',
          controllerId:    CTRL_UUID2,  // linked to second controller
          description:     null,
          landscapeTypes:  null,
          irrigationTypes: null,
          notes:           null,
        }],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      // CTRL_UUID2 was assigned ephemeral id=2
      expect(result.zones[0].controller).toBe('2')
    })

    it('sets zone.controller to empty string when controllerId is null', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        controllers: [{ id: CTRL_UUID, location: null, manufacturer: null, model: null, sensors: null, numZones: '0', masterValve: false, masterValveNotes: null, notes: null }],
        zones: [{
          id: ZONE_UUID, zoneNum: '1', controllerId: null,
          description: null, landscapeTypes: null, irrigationTypes: null, notes: null,
        }],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      expect(result.zones[0].controller).toBe('')
    })

    it('sets zone.controller to empty string when controllerId references unknown controller', async () => {
      // Zone references a controller UUID that is not in the returned controllers list
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        controllers: [{ id: CTRL_UUID, location: null, manufacturer: null, model: null, sensors: null, numZones: '0', masterValve: false, masterValveNotes: null, notes: null }],
        zones: [{
          id: ZONE_UUID, zoneNum: '1', controllerId: 'unknown-ctrl-uuid',
          description: null, landscapeTypes: null, irrigationTypes: null, notes: null,
        }],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      // controllerEphemeralMap.get('unknown-ctrl-uuid') returns undefined → falls back to ''
      expect(result.zones[0].controller).toBe('')
    })

    it('converts null nullable fields to empty strings / empty arrays', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        zones: [{
          id: ZONE_UUID, zoneNum: '1', controllerId: null,
          description: null, landscapeTypes: null, irrigationTypes: null, notes: null,
        }],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      const z = result.zones[0]
      expect(z.description).toBe('')
      expect(z.landscapeTypes).toEqual([])
      expect(z.irrigationTypes).toEqual([])
      expect(z.notes).toBe('')
    })

    it('always sets photoData to empty array (photos are visit-specific)', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        zones: [{
          id: ZONE_UUID, zoneNum: '1', controllerId: null,
          description: 'Test', landscapeTypes: [], irrigationTypes: [], notes: 'hi',
        }],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      expect(result.zones[0].photoData).toEqual([])
    })
  })

  // ── Backflows ─────────────────────────────────────────────────────────────

  describe('backflows', () => {
    it('maps a backflow row to BackflowFormData shape', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        backflows: [{
          id:           BF_UUID,
          manufacturer: 'Watts',
          type:         'Reduced Pressure',
          model:        'RPC',
          size:         '1',
        }],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)

      expect(result.backflows).toHaveLength(1)
      const bf = result.backflows[0]
      expect(bf.manufacturer).toBe('Watts')
      expect(bf.type).toBe('Reduced Pressure')
      expect(bf.model).toBe('RPC')
      expect(bf.size).toBe('1')
    })

    it('assigns ephemeral IDs continuing from controllers + zones', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        controllers: [{ id: CTRL_UUID, location: null, manufacturer: null, model: null, sensors: null, numZones: '0', masterValve: false, masterValveNotes: null, notes: null }],
        zones:       [{ id: ZONE_UUID, zoneNum: '1', controllerId: null, description: null, landscapeTypes: null, irrigationTypes: null, notes: null }],
        backflows:   [{ id: BF_UUID,   manufacturer: null, type: null, model: null, size: null }],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      // controller=1, zone=2, backflow=3
      expect(result.controllers[0].id).toBe(1)
      expect(result.zones[0].id).toBe(2)
      expect(result.backflows[0].id).toBe(3)
    })

    it('converts null nullable fields to empty strings', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        backflows: [{
          id:           BF_UUID,
          manufacturer: null,
          type:         null,
          model:        null,
          size:         null,
        }],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      const bf = result.backflows[0]
      expect(bf.manufacturer).toBe('')
      expect(bf.type).toBe('')
      expect(bf.model).toBe('')
      expect(bf.size).toBe('')
    })

    it('handles multiple backflow devices', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        backflows: [
          { id: 'bf-1', manufacturer: 'Watts',  type: 'RPZ', model: 'LF007', size: '1'   },
          { id: 'bf-2', manufacturer: 'Febco',  type: 'PVB', model: '765',   size: '1.5' },
          { id: 'bf-3', manufacturer: 'Wilkins', type: 'DC', model: '350',   size: '2'   },
        ],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      expect(result.backflows).toHaveLength(3)
      expect(result.backflows[2].manufacturer).toBe('Wilkins')
    })

    it('returns empty backflows array when site has no backflow devices', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        backflows: [],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      expect(result.backflows).toEqual([])
    })
  })

  // ── Overview (latest visit) ───────────────────────────────────────────────

  describe('overview', () => {
    it('returns overview from the latest visit row', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        visits: [{
          staticPressure:      '65.00',
          backflowInstalled:   true,
          backflowServiceable: true,
          isolationValve:      false,
          systemNotes:         'System in good shape',
        }],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)

      expect(result.overview).not.toBeNull()
      expect(result.overview!.staticPressure).toBe('65.00')
      expect(result.overview!.backflowInstalled).toBe(true)
      expect(result.overview!.backflowServiceable).toBe(true)
      expect(result.overview!.isolationValve).toBe(false)
      expect(result.overview!.systemNotes).toBe('System in good shape')
    })

    it('returns null overview when no visits exist', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        visits: [],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      expect(result.overview).toBeNull()
    })

    it('converts null staticPressure to empty string', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        visits: [{
          staticPressure:      null,
          backflowInstalled:   false,
          backflowServiceable: false,
          isolationValve:      false,
          systemNotes:         null,
        }],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      expect(result.overview!.staticPressure).toBe('')
    })

    it('converts null systemNotes to empty string', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        visits: [{
          staticPressure:      '50',
          backflowInstalled:   false,
          backflowServiceable: false,
          isolationValve:      false,
          systemNotes:         null,
        }],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      expect(result.overview!.systemNotes).toBe('')
    })

    it('preserves boolean false values in overview', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        visits: [{
          staticPressure:      null,
          backflowInstalled:   false,
          backflowServiceable: false,
          isolationValve:      false,
          systemNotes:         null,
        }],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      expect(result.overview!.backflowInstalled).toBe(false)
      expect(result.overview!.backflowServiceable).toBe(false)
      expect(result.overview!.isolationValve).toBe(false)
    })
  })

  // ── controllerEphemeralMap (FK wiring) ───────────────────────────────────

  describe('controllerEphemeralMap (FK wiring)', () => {
    it('correctly maps 3 controllers so zones reference the right ephemeral IDs', async () => {
      const CTRL_A = 'ctrl-aaa', CTRL_B = 'ctrl-bbb', CTRL_C = 'ctrl-ccc'
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        controllers: [
          { id: CTRL_A, location: 'Front',  manufacturer: null, model: null, sensors: null, numZones: '0', masterValve: false, masterValveNotes: null, notes: null },
          { id: CTRL_B, location: 'Middle', manufacturer: null, model: null, sensors: null, numZones: '0', masterValve: false, masterValveNotes: null, notes: null },
          { id: CTRL_C, location: 'Back',   manufacturer: null, model: null, sensors: null, numZones: '0', masterValve: false, masterValveNotes: null, notes: null },
        ],
        zones: [
          { id: 'z1', zoneNum: '1', controllerId: CTRL_C, description: null, landscapeTypes: null, irrigationTypes: null, notes: null },
          { id: 'z2', zoneNum: '2', controllerId: CTRL_A, description: null, landscapeTypes: null, irrigationTypes: null, notes: null },
          { id: 'z3', zoneNum: '3', controllerId: CTRL_B, description: null, landscapeTypes: null, irrigationTypes: null, notes: null },
        ],
      })
      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)
      // CTRL_A=1, CTRL_B=2, CTRL_C=3
      expect(result.zones[0].controller).toBe('3') // zone 1 → CTRL_C=3
      expect(result.zones[1].controller).toBe('1') // zone 2 → CTRL_A=1
      expect(result.zones[2].controller).toBe('2') // zone 3 → CTRL_B=2
    })
  })

  // ── Full equipment set ────────────────────────────────────────────────────

  describe('full equipment set', () => {
    it('returns all equipment types together correctly', async () => {
      const mockDb = buildMockDb({
        siteCheckResult: [{ id: SITE_ID }],
        controllers: [
          { id: CTRL_UUID, location: 'Front', manufacturer: 'Hunter', model: 'Pro-HC', sensors: 'Rain', numZones: '6', masterValve: true, masterValveNotes: 'OK', notes: '' },
        ],
        zones: [
          { id: ZONE_UUID, zoneNum: '1', controllerId: CTRL_UUID, description: 'Front lawn', landscapeTypes: ['Full-sun turf'], irrigationTypes: ['Rotor'], notes: '' },
        ],
        backflows: [
          { id: BF_UUID, manufacturer: 'Watts', type: 'RPZ', model: 'LF007', size: '1' },
        ],
        visits: [{
          staticPressure: '70', backflowInstalled: true, backflowServiceable: true,
          isolationValve: true, systemNotes: 'Good',
        }],
      })

      const result = await findSiteEquipment(SITE_ID, COMPANY_ID, mockDb)

      expect(result.controllers).toHaveLength(1)
      expect(result.zones).toHaveLength(1)
      expect(result.backflows).toHaveLength(1)
      expect(result.overview).not.toBeNull()

      // ID counter: ctrl=1, zone=2, backflow=3
      expect(result.controllers[0].id).toBe(1)
      expect(result.zones[0].id).toBe(2)
      expect(result.backflows[0].id).toBe(3)

      // Zone FK wiring
      expect(result.zones[0].controller).toBe('1')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getSiteEquipment — Server Action wrapper
// ─────────────────────────────────────────────────────────────────────────────

describe('getSiteEquipment()', () => {
  const mockGetRequiredCompanyId = getRequiredCompanyId as jest.Mock

  beforeEach(() => {
    mockGetRequiredCompanyId.mockReset()
  })

  it('calls getRequiredCompanyId() to resolve the company', async () => {
    mockGetRequiredCompanyId.mockResolvedValue(COMPANY_ID)

    // We can't easily inject the db here, so we just spy on what getSiteEquipment does.
    // The underlying findSiteEquipment will use the module-level `db` which we mocked as {}.
    // Since `db` is an empty object, select() won't exist and the call will throw.
    // We just need to confirm getRequiredCompanyId was called.
    await getSiteEquipment(SITE_ID).catch(() => {/* expected to fail without real db */})

    expect(mockGetRequiredCompanyId).toHaveBeenCalledTimes(1)
  })

  it('propagates errors from findSiteEquipment (e.g., Site not found)', async () => {
    mockGetRequiredCompanyId.mockResolvedValue(COMPANY_ID)

    // The mock db ({}) has no select() → will throw a TypeError.
    // That error should propagate from getSiteEquipment.
    await expect(getSiteEquipment(SITE_ID)).rejects.toThrow()
  })

  it('propagates errors from getRequiredCompanyId', async () => {
    mockGetRequiredCompanyId.mockRejectedValue(new Error('Not authenticated'))

    await expect(getSiteEquipment(SITE_ID)).rejects.toThrow('Not authenticated')
  })
})
