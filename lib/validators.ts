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

export type CreateClientInput      = z.infer<typeof createClientSchema>
export type CreateSiteInput        = z.infer<typeof createSiteSchema>
export type CompanySettingsInput   = z.infer<typeof companySettingsSchema>
export type CreateTechnicianInput  = z.infer<typeof createTechnicianSchema>
