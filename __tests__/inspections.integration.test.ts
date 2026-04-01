import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { startTestDb, stopTestDb, withRollback } from '../test/helpers/db'
import {
  sites, clients, inspectors, siteVisits, siteControllers, siteZones, siteBackflows,
} from '@/lib/schema'
import { getInspectionForEdit } from '@/actions/inspections'
import type * as schema from '@/lib/schema'

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

// ── helpers ─────────────────────────────────────────────────────────────────

async function insertFixture(db: PostgresJsDatabase<typeof schema>) {
  const [site]       = await db.insert(sites).values({ name: 'Acme HQ', address: '1 Main St' }).returning()
  const [client]     = await db.insert(clients).values({ name: 'Acme Corp', address: '2 Corp Ave' }).returning()
  const [inspector]  = await db.insert(inspectors).values({ firstName: 'Jane', lastName: 'Smith' }).returning()
  const [controller] = await db.insert(siteControllers).values({
    siteId: site.id, location: 'Front', manufacturer: 'Hunter', model: 'Pro-HC',
    sensors: 'Rain', numZones: '6', masterValve: true,
  }).returning()
  const [zone] = await db.insert(siteZones).values({
    siteId: site.id, controllerId: controller.id,
    zoneNum: '1', description: 'Front lawn',
    landscapeTypes: ['Full-sun turf'], irrigationTypes: ['Rotor'],
    notes: 'Needs adjustment',
  }).returning()
  const [backflow] = await db.insert(siteBackflows).values({
    siteId: site.id, manufacturer: 'Febco', type: 'RPZ', model: '825Y', size: '1',
  }).returning()

  const zoneIssues = [{ zoneNum: '1', issues: ['Runoff', 'Overspray'] }]
  const quoteItems = [{ id: 1, location: 'C1-Z1', item: 'Replace head', description: 'Pop-up', price: '45.00', qty: '2' }]

  const [visit] = await db.insert(siteVisits).values({
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

// ── tests ────────────────────────────────────────────────────────────────────

describe('getInspectionForEdit', () => {
  test('returns null for a non-existent siteVisitId', async () => {
    await withRollback(async () => {
      const result = await getInspectionForEdit(999999)
      expect(result).toBeNull()
    })
  })

  test('returns correctly mapped initial data for an existing visit', async () => {
    await withRollback(async (db) => {
      const { visit, client, inspector } = await insertFixture(db)

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
  })

  test('returns default empty quote item row when visit has no quote items', async () => {
    await withRollback(async (db) => {
      const [site] = await db.insert(sites).values({ name: 'Bare Site' }).returning()
      const [visit] = await db.insert(siteVisits).values({
        siteId: site.id, datePerformed: '2025-07-01',
      }).returning()

      const data = await getInspectionForEdit(visit.siteVisitId)
      expect(data).not.toBeNull()
      expect(data!.quoteItems).toHaveLength(1)
      expect(data!.quoteItems[0].item).toBe('')
      expect(data!.quoteItems[0].qty).toBe('1')
    })
  })

  test('zones without a controller have empty controller field', async () => {
    await withRollback(async (db) => {
      const [site] = await db.insert(sites).values({ name: 'No Controller Site' }).returning()
      await db.insert(siteZones).values({ siteId: site.id, zoneNum: '1' })
      const [visit] = await db.insert(siteVisits).values({
        siteId: site.id, datePerformed: '2025-07-01',
      }).returning()

      const data = await getInspectionForEdit(visit.siteVisitId)
      expect(data!.zones[0].controller).toBe('')
    })
  })
})
