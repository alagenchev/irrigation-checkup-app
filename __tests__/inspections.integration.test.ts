import { and, eq } from 'drizzle-orm'
import { startTestDb, stopTestDb, testDb, TEST_COMPANY_ID } from '../test/helpers/db'
import {
  sites, clients, inspectors, siteVisits, siteControllers, siteZones, siteBackflows,
} from '@/lib/schema'
import { getInspectionForEdit } from '@/actions/inspections'

// Mock getRequiredCompanyId so getInspectionForEdit resolves the tenant
// without a live Clerk session in the test environment.
jest.mock('@/lib/tenant', () => ({
  getRequiredCompanyId: jest.fn(),
}))

import { getRequiredCompanyId } from '@/lib/tenant'
const mockGetCid = getRequiredCompanyId as jest.MockedFunction<typeof getRequiredCompanyId>

beforeAll(async () => {
  await startTestDb()
  mockGetCid.mockResolvedValue(TEST_COMPANY_ID)
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

// ── fixture helpers — insert directly on testDb (committed, visible to actions) ──

async function insertFixture() {
  const [site]       = await testDb.insert(sites).values({ companyId: TEST_COMPANY_ID, name: 'Acme HQ', address: '1 Main St' }).returning()
  const [client]     = await testDb.insert(clients).values({ companyId: TEST_COMPANY_ID, name: 'Acme Corp', address: '2 Corp Ave' }).returning()
  const [inspector]  = await testDb.insert(inspectors).values({ companyId: TEST_COMPANY_ID, firstName: 'Jane', lastName: 'Smith' }).returning()
  const [controller] = await testDb.insert(siteControllers).values({
    companyId: TEST_COMPANY_ID, siteId: site.id,
    location: 'Front', manufacturer: 'Hunter', model: 'Pro-HC',
    sensors: 'Rain', numZones: '6', masterValve: true,
  }).returning()
  const [zone] = await testDb.insert(siteZones).values({
    companyId: TEST_COMPANY_ID, siteId: site.id, controllerId: controller.id,
    zoneNum: '1', description: 'Front lawn',
    landscapeTypes: ['Full-sun turf'], irrigationTypes: ['Rotor'],
    notes: 'Needs adjustment',
  }).returning()
  const [backflow] = await testDb.insert(siteBackflows).values({
    companyId: TEST_COMPANY_ID, siteId: site.id,
    manufacturer: 'Febco', type: 'RPZ', model: '825Y', size: '1',
  }).returning()

  const zoneIssues = [{ zoneNum: '1', issues: ['Runoff', 'Overspray'] }]
  const quoteItems = [{ id: 1, location: 'C1-Z1', item: 'Replace head', description: 'Pop-up', price: '45.00', qty: '2' }]

  const [visit] = await testDb.insert(siteVisits).values({
    companyId: TEST_COMPANY_ID,
    siteId:      site.id,
    clientId:    client.id,
    inspectorId: inspector.id,
    datePerformed: '2025-06-15',
    inspectionType: 'Start-up',
    status:        'In Progress',
    repairEstimate: '90.00',
    inspectionNotes: 'All zones tested.',
    internalNotes:   'Morning visit.',
    staticPressure:  '65.5',
    backflowInstalled:   true,
    backflowServiceable: true,
    isolationValve:      false,
    systemNotes:   'Hunter Pro-HC',
    zoneIssues,
    quoteItems,
  }).returning()

  return { site, client, inspector, controller, zone, backflow, visit }
}

/** Clean up all test data for the test company after each test. */
async function cleanupTestData() {
  await testDb.delete(siteVisits).where(eq(siteVisits.companyId, TEST_COMPANY_ID))
  await testDb.delete(siteBackflows).where(eq(siteBackflows.companyId, TEST_COMPANY_ID))
  await testDb.delete(siteZones).where(eq(siteZones.companyId, TEST_COMPANY_ID))
  await testDb.delete(siteControllers).where(eq(siteControllers.companyId, TEST_COMPANY_ID))
  await testDb.delete(sites).where(and(eq(sites.companyId, TEST_COMPANY_ID), eq(sites.name, 'Acme HQ')))
  await testDb.delete(sites).where(and(eq(sites.companyId, TEST_COMPANY_ID), eq(sites.name, 'Bare Site')))
  await testDb.delete(sites).where(and(eq(sites.companyId, TEST_COMPANY_ID), eq(sites.name, 'No Controller Site')))
  await testDb.delete(clients).where(eq(clients.companyId, TEST_COMPANY_ID))
  await testDb.delete(inspectors).where(eq(inspectors.companyId, TEST_COMPANY_ID))
}

afterEach(async () => {
  await cleanupTestData()
})

// ── tests ────────────────────────────────────────────────────────────────────

describe('getInspectionForEdit', () => {
  test('returns null for a non-existent siteVisitId', async () => {
    const result = await getInspectionForEdit(999999)
    expect(result).toBeNull()
  })

  test('returns correctly mapped initial data for an existing visit', async () => {
    const { visit, client, inspector } = await insertFixture()

    const data = await getInspectionForEdit(visit.siteVisitId)
    expect(data).not.toBeNull()
    if (!data) return

    expect(data.siteVisitId).toBe(visit.siteVisitId)

    // Form fields
    expect(data.form.siteName).toBe('Acme HQ')
    expect(data.form.siteAddress).toBe('1 Main St')
    expect(data.form.clientName).toBe(client.name)
    expect(data.form.clientAddress).toBe(client.address)
    expect(data.form.inspectorId).toBe(String(inspector.id))
    expect(data.form.datePerformed).toBe('2025-06-15')
    expect(data.form.inspectionType).toBe('Start-up')
    expect(data.form.status).toBe('In Progress')
    expect(data.form.repairEstimate).toBe('90.00')
    expect(data.form.inspectionNotes).toBe('All zones tested.')
    expect(data.form.internalNotes).toBe('Morning visit.')
    expect(data.form.staticPressure).toBe('65.5')
    expect(data.form.backflowInstalled).toBe(true)
    expect(data.form.backflowServiceable).toBe(true)
    expect(data.form.isolationValve).toBe(false)
    expect(data.form.systemNotes).toBe('Hunter Pro-HC')

    // Controllers
    expect(data.controllers).toHaveLength(1)
    const ctrl = data.controllers[0]
    expect(ctrl.location).toBe('Front')
    expect(ctrl.manufacturer).toBe('Hunter')
    expect(ctrl.model).toBe('Pro-HC')
    expect(ctrl.masterValve).toBe(true)
    expect(ctrl.numZones).toBe('6')

    // Zones — controller FK maps to ephemeral controller id
    expect(data.zones).toHaveLength(1)
    const z = data.zones[0]
    expect(z.zoneNum).toBe('1')
    expect(z.description).toBe('Front lawn')
    expect(z.landscapeTypes).toEqual(['Full-sun turf'])
    expect(z.irrigationTypes).toEqual(['Rotor'])
    expect(z.notes).toBe('Needs adjustment')
    expect(z.controller).toBe(String(ctrl.id))

    // Backflows
    expect(data.backflows).toHaveLength(1)
    expect(data.backflows[0].manufacturer).toBe('Febco')
    expect(data.backflows[0].type).toBe('RPZ')

    // Zone issues from snapshot
    expect(data.zoneIssues['1']).toEqual(['Runoff', 'Overspray'])

    // Quote items from snapshot
    expect(data.quoteItems).toHaveLength(1)
    expect(data.quoteItems[0].item).toBe('Replace head')
    expect(data.quoteItems[0].price).toBe('45.00')
  })

  test('returns default empty quote item row when visit has no quote items', async () => {
    const [site] = await testDb.insert(sites).values({ companyId: TEST_COMPANY_ID, name: 'Bare Site' }).returning()
    const [visit] = await testDb.insert(siteVisits).values({
      companyId: TEST_COMPANY_ID, siteId: site.id, datePerformed: '2025-07-01',
    }).returning()

    const data = await getInspectionForEdit(visit.siteVisitId)
    expect(data).not.toBeNull()
    expect(data!.quoteItems).toHaveLength(1)
    expect(data!.quoteItems[0].item).toBe('')
    expect(data!.quoteItems[0].qty).toBe('1')
  })

  test('zones without a controller have empty controller field', async () => {
    const [site] = await testDb.insert(sites).values({ companyId: TEST_COMPANY_ID, name: 'No Controller Site' }).returning()
    await testDb.insert(siteZones).values({ companyId: TEST_COMPANY_ID, siteId: site.id, zoneNum: '1' })
    const [visit] = await testDb.insert(siteVisits).values({
      companyId: TEST_COMPANY_ID, siteId: site.id, datePerformed: '2025-07-01',
    }).returning()

    const data = await getInspectionForEdit(visit.siteVisitId)
    expect(data!.zones[0].controller).toBe('')
  })

  test('returns null for a visit belonging to a different company', async () => {
    // Insert a visit for another company
    const [otherCompany] = await testDb.insert(require('@/lib/schema').companies)
      .values({ clerkOrgId: 'org_other_inspect_test' }).returning()
    const [otherSite] = await testDb.insert(sites)
      .values({ companyId: otherCompany.id, name: 'Other Site' }).returning()
    const [otherVisit] = await testDb.insert(siteVisits)
      .values({ companyId: otherCompany.id, siteId: otherSite.id, datePerformed: '2025-06-15' })
      .returning()

    // getInspectionForEdit mocked to return TEST_COMPANY_ID — should NOT return the other company's visit
    const result = await getInspectionForEdit(otherVisit.siteVisitId)
    expect(result).toBeNull()

    // Cleanup other company's data
    await testDb.delete(siteVisits).where(eq(siteVisits.companyId, otherCompany.id))
    await testDb.delete(sites).where(eq(sites.companyId, otherCompany.id))
    await testDb.delete(require('@/lib/schema').companies).where(eq(require('@/lib/schema').companies.id, otherCompany.id))
  })
})
