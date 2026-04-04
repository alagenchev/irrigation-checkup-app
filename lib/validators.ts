import { z } from 'zod'

export const createClientSchema = z.object({
  name:          z.string().min(1, 'Name is required').max(255),
  address:       z.string().max(500).optional(),
  phone:         z.string().max(50).optional(),
  email:         z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  accountType:   z.string().max(100).optional(),
  accountNumber: z.string().max(100).optional(),
})

export const createSiteSchema = z.object({
  name:       z.string().min(1, 'Site name is required').max(255),
  address:    z.string().max(500).optional(),
  clientName: z.string().max(255).optional(), // resolved to clientId in the action
  notes:      z.string().max(2000).optional(),
})

export const companySettingsSchema = z.object({
  companyName:         z.string().min(1, 'Company name is required').max(255),
  licenseNum:          z.string().max(100).optional().default(''),
  companyAddress:      z.string().max(500).optional().default(''),
  companyCityStateZip: z.string().max(255).optional().default(''),
  companyPhone:        z.string().max(50).optional().default(''),
  performedBy:         z.string().max(255).optional().default(''),
})

export const createTechnicianSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
})

export const createInspectorSchema = z.object({
  firstName:  z.string().min(1, 'First name is required').max(255),
  lastName:   z.string().min(1, 'Last name is required').max(255),
  email:      z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  phone:      z.string().max(50).optional(),
  licenseNum: z.string().max(100).optional(),
})
export const updateInspectorSchema = createInspectorSchema.partial()

// ── Site equipment ────────────────────────────────────────────────────────

export const createSiteControllerSchema = z.object({
  siteId:           z.string().uuid(),
  location:         z.string().max(255).optional(),
  manufacturer:     z.string().max(255).optional(),
  model:            z.string().max(255).optional(),
  sensors:          z.string().max(255).optional(),
  numZones:         z.string().max(10).optional().default('0'),
  masterValve:      z.boolean().optional().default(false),
  masterValveNotes: z.string().optional(),
  notes:            z.string().optional(),
})

export const updateSiteControllerSchema = createSiteControllerSchema
  .omit({ siteId: true })
  .partial()

export const createSiteZoneSchema = z.object({
  siteId:          z.string().uuid(),
  controllerId:    z.string().uuid().nullable().optional(),
  zoneNum:         z.string().min(1, 'Zone number is required').max(20),
  description:     z.string().max(500).optional(),
  landscapeTypes:  z.array(z.string()).optional().default([]),
  irrigationTypes: z.array(z.string()).optional().default([]),
  notes:           z.string().max(2000).optional(),
})

export const updateSiteZoneSchema = createSiteZoneSchema
  .omit({ siteId: true })
  .partial()
  .extend({ zoneNum: z.string().min(1).max(20).optional() })

export const createSiteBackflowSchema = z.object({
  siteId:       z.string().uuid(),
  manufacturer: z.string().max(255).optional(),
  type:         z.string().max(255).optional(),
  model:        z.string().max(255).optional(),
  size:         z.string().max(50).optional(),
})

export const updateSiteBackflowSchema = createSiteBackflowSchema
  .omit({ siteId: true })
  .partial()

// ── Site visits ───────────────────────────────────────────────────────────

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const createSiteVisitSchema = z.object({
  siteId:      z.string().uuid(),
  clientId:    z.string().uuid().nullable().optional(),
  inspectorId: z.string().uuid().nullable().optional(),

  // Inspection details
  datePerformed:   isoDate,
  inspectionType:  z.string().max(100).optional().default('Repair Inspection'),
  accountType:     z.string().max(100).nullable().optional(),
  accountNumber:   z.string().max(100).nullable().optional(),
  status:          z.string().max(50).optional().default('New'),
  dueDate:         isoDate.nullable().optional(),
  repairEstimate:  z.string().nullable().optional(),
  inspectionNotes: z.string().nullable().optional(),
  internalNotes:   z.string().nullable().optional(),

  // System overview — undefined means "inherit from most recent prior visit"
  staticPressure:      z.string().nullable().optional(),
  backflowInstalled:   z.boolean().optional(),
  backflowServiceable: z.boolean().optional(),
  isolationValve:      z.boolean().optional(),
  systemNotes:         z.string().nullable().optional(),

  // Visit-specific snapshot data — never auto-populated
  zoneIssues: z.array(z.unknown()).optional(),
  quoteItems: z.array(z.unknown()).optional(),
})

// ── Save inspection (full form submission) ───────────────────────────────

const controllerRow = z.object({
  id: z.number(), location: z.string(), manufacturer: z.string(),
  model: z.string(), sensors: z.string(), numZones: z.string(),
  masterValve: z.boolean(), masterValveNotes: z.string(), notes: z.string(),
})
const zoneRow = z.object({
  id: z.number(), zoneNum: z.string(), controller: z.string(),
  description: z.string(), landscapeTypes: z.array(z.string()),
  irrigationTypes: z.array(z.string()), notes: z.string(),
  photoData: z.array(z.object({ url: z.string(), annotation: z.string() })),
})
const backflowRow = z.object({
  id: z.number(), manufacturer: z.string(), type: z.string(),
  model: z.string(), size: z.string(),
})
const quoteItemRow = z.object({
  id: z.number(), location: z.string(), item: z.string(),
  description: z.string(), price: z.string(), qty: z.string(),
})

export const saveInspectionSchema = z.object({
  siteName:      z.string().min(1, 'Site name is required'),
  siteAddress:   z.string().optional(),
  clientName:    z.string().optional(),
  clientAddress: z.string().optional(),
  clientEmail:   z.string().email().optional(),
  inspectorId: z.string().uuid().nullable().optional(),

  datePerformed:   isoDate,
  inspectionType:  z.string().max(100).optional().default('Repair Inspection'),
  accountType:     z.string().optional(),
  accountNumber:   z.string().optional(),
  status:          z.string().optional().default('New'),
  dueDate:         z.string().optional(),
  repairEstimate:  z.string().optional(),
  inspectionNotes: z.string().optional(),
  internalNotes:   z.string().optional(),

  staticPressure:      z.string().optional(),
  backflowInstalled:   z.boolean(),
  backflowServiceable: z.boolean(),
  isolationValve:      z.boolean(),
  systemNotes:         z.string().optional(),

  controllers: z.array(controllerRow),
  zones:       z.array(zoneRow),
  backflows:   z.array(backflowRow),
  zoneIssues:  z.record(z.string(), z.array(z.string())),
  quoteItems:  z.array(quoteItemRow),
})

export type CreateClientInput         = z.infer<typeof createClientSchema>
export type CreateSiteInput           = z.infer<typeof createSiteSchema>
export type CompanySettingsInput      = z.infer<typeof companySettingsSchema>
export type CreateTechnicianInput     = z.infer<typeof createTechnicianSchema>
export type CreateInspectorInput      = z.infer<typeof createInspectorSchema>
export type UpdateInspectorInput      = z.infer<typeof updateInspectorSchema>
export type CreateSiteControllerInput = z.infer<typeof createSiteControllerSchema>
export type UpdateSiteControllerInput = z.infer<typeof updateSiteControllerSchema>
export type CreateSiteZoneInput       = z.infer<typeof createSiteZoneSchema>
export type UpdateSiteZoneInput       = z.infer<typeof updateSiteZoneSchema>
export type CreateSiteBackflowInput   = z.infer<typeof createSiteBackflowSchema>
export type UpdateSiteBackflowInput   = z.infer<typeof updateSiteBackflowSchema>
export type CreateSiteVisitInput      = z.infer<typeof createSiteVisitSchema>
export type SaveInspectionInput       = z.infer<typeof saveInspectionSchema>
