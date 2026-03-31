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

// ── Site equipment ────────────────────────────────────────────────────────

export const createSiteControllerSchema = z.object({
  siteId:       z.number().int().positive(),
  location:     z.string().max(255).optional(),
  manufacturer: z.string().max(255).optional(),
  model:        z.string().max(255).optional(),
  sensors:      z.string().max(255).optional(),
  numZones:     z.string().max(10).optional().default('0'),
  masterValve:  z.boolean().optional().default(false),
  notes:        z.string().optional(),
})

export const updateSiteControllerSchema = createSiteControllerSchema
  .omit({ siteId: true })
  .partial()

export const createSiteZoneSchema = z.object({
  siteId:          z.number().int().positive(),
  controllerId:    z.number().int().positive().nullable().optional(),
  zoneNum:         z.string().min(1, 'Zone number is required').max(20),
  description:     z.string().max(500).optional(),
  landscapeTypes:  z.array(z.string()).optional().default([]),
  irrigationTypes: z.array(z.string()).optional().default([]),
})

export const updateSiteZoneSchema = createSiteZoneSchema
  .omit({ siteId: true })
  .partial()
  .extend({ zoneNum: z.string().min(1).max(20).optional() })

export const createSiteBackflowSchema = z.object({
  siteId:       z.number().int().positive(),
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
  siteId:       z.number().int().positive(),
  clientId:     z.number().int().positive().nullable().optional(),
  technicianId: z.number().int().positive().nullable().optional(),

  // Checkup details
  datePerformed:  isoDate,
  checkupType:    z.string().max(100).optional().default('Repair Checkup'),
  accountType:    z.string().max(100).nullable().optional(),
  accountNumber:  z.string().max(100).nullable().optional(),
  status:         z.string().max(50).optional().default('New'),
  dueDate:        isoDate.nullable().optional(),
  repairEstimate: z.string().nullable().optional(),
  checkupNotes:   z.string().nullable().optional(),
  internalNotes:  z.string().nullable().optional(),

  // System overview — undefined means "inherit from most recent prior visit"
  staticPressure:      z.string().nullable().optional(),
  backflowInstalled:   z.boolean().optional(),
  backflowServiceable: z.boolean().optional(),
  isolationValve:      z.boolean().optional(),
  systemNotes:         z.string().nullable().optional(),

  // Visit-specific snapshot data — never auto-populated
  zoneIssues: z.array(z.unknown()).optional(),
  zoneNotes:  z.array(z.unknown()).optional(),
  quoteItems: z.array(z.unknown()).optional(),
})

export type CreateClientInput         = z.infer<typeof createClientSchema>
export type CreateSiteInput           = z.infer<typeof createSiteSchema>
export type CompanySettingsInput      = z.infer<typeof companySettingsSchema>
export type CreateTechnicianInput     = z.infer<typeof createTechnicianSchema>
export type CreateSiteControllerInput = z.infer<typeof createSiteControllerSchema>
export type UpdateSiteControllerInput = z.infer<typeof updateSiteControllerSchema>
export type CreateSiteZoneInput       = z.infer<typeof createSiteZoneSchema>
export type UpdateSiteZoneInput       = z.infer<typeof updateSiteZoneSchema>
export type CreateSiteBackflowInput   = z.infer<typeof createSiteBackflowSchema>
export type UpdateSiteBackflowInput   = z.infer<typeof updateSiteBackflowSchema>
export type CreateSiteVisitInput      = z.infer<typeof createSiteVisitSchema>
