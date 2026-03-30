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

export type CreateClientInput = z.infer<typeof createClientSchema>
export type CreateSiteInput   = z.infer<typeof createSiteSchema>
