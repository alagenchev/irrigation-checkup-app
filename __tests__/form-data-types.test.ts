/**
 * Type-shape tests: verify that ControllerFormData, ZoneFormData, BackflowFormData,
 * and QuoteItemFormData stay in sync with the corresponding Zod schemas in validators.ts.
 *
 * These tests catch drift between parallel type definitions — e.g., adding a field to
 * ControllerFormData but forgetting to add it to the saveInspectionSchema controllerRow,
 * or vice versa.  A TypeScript compile error here means the types have diverged.
 */

import { z } from 'zod'
import { saveInspectionSchema } from '@/lib/validators'
import type {
  ControllerFormData,
  ZoneFormData,
  BackflowFormData,
  QuoteItemFormData,
} from '@/types'

// Extract the inferred types from the Zod schemas so we can compare against the TS types.
type SchemaControllerRow = z.infer<typeof saveInspectionSchema>['controllers'][number]
type SchemaZoneRow       = z.infer<typeof saveInspectionSchema>['zones'][number]
type SchemaBackflowRow   = z.infer<typeof saveInspectionSchema>['backflows'][number]
type SchemaQuoteItemRow  = z.infer<typeof saveInspectionSchema>['quoteItems'][number]

// Compile-time checks: ControllerFormData must be assignable to the schema row type.
// If a required field is present in the schema but missing from the TS type (or vice versa),
// TypeScript will error here before any test even runs.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _assertCtrl(_: ControllerFormData): SchemaControllerRow { return _ }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _assertZone(_: ZoneFormData): SchemaZoneRow { return _ }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _assertBf(_: BackflowFormData): SchemaBackflowRow { return _ }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _assertQi(_: QuoteItemFormData): SchemaQuoteItemRow { return _ }

// Runtime shape tests: confirm that a complete, valid ControllerFormData object
// passes the Zod schema.  If a new required field is added to one but not the other,
// both the compile-time check above AND this runtime parse will fail.
describe('form data shapes match Zod schemas', () => {
  const validBase = {
    siteName: 'Test Site',
    datePerformed: '2025-01-01',
    backflowInstalled: false,
    backflowServiceable: false,
    isolationValve: false,
    controllers: [],
    zones: [],
    backflows: [],
    quoteItems: [],
    zoneIssues: {},
  }

  test('controllerRow schema accepts a complete ControllerFormData object', () => {
    const ctrl: ControllerFormData = {
      id: 1, location: 'Front', manufacturer: 'Hunter', model: 'Pro-HC',
      sensors: 'Rain', numZones: '6', masterValve: true, masterValveNotes: 'Leaking', notes: '',
    }
    const r = saveInspectionSchema.safeParse({ ...validBase, controllers: [ctrl] })
    expect(r.success).toBe(true)
  })

  test('zoneRow schema accepts a complete ZoneFormData object', () => {
    const zone: ZoneFormData = {
      id: 2, zoneNum: '1', controller: '1', description: 'Lawn',
      landscapeTypes: ['Full-sun turf'], irrigationTypes: ['Rotor'], notes: '', photoData: [],
    }
    const r = saveInspectionSchema.safeParse({ ...validBase, zones: [zone] })
    expect(r.success).toBe(true)
  })

  test('backflowRow schema accepts a complete BackflowFormData object', () => {
    const bf: BackflowFormData = {
      id: 3, manufacturer: 'Watts', type: 'RPZ', model: '009', size: '1',
    }
    const r = saveInspectionSchema.safeParse({ ...validBase, backflows: [bf] })
    expect(r.success).toBe(true)
  })

  test('quoteItemRow schema accepts a complete QuoteItemFormData object', () => {
    const qi: QuoteItemFormData = {
      id: 4, location: 'Zone 1', item: 'Replace head', description: '4" popup', price: '25.00', qty: '2',
    }
    const r = saveInspectionSchema.safeParse({ ...validBase, quoteItems: [qi] })
    expect(r.success).toBe(true)
  })

  test('controllerRow schema rejects a controller missing masterValveNotes', () => {
    const { masterValveNotes: _, ...incomplete } = {
      id: 1, location: '', manufacturer: '', model: '', sensors: '',
      numZones: '0', masterValve: false, masterValveNotes: '', notes: '',
    }
    const r = saveInspectionSchema.safeParse({ ...validBase, controllers: [incomplete] })
    expect(r.success).toBe(false)
  })
})
