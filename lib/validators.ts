import { z } from 'zod'

export const createClientSchema = z.object({
  name:          z.string().min(1, 'Name is required').max(255),
  address:       z.string().max(500).optional(),
  phone:         z.string().max(50).optional(),
  email:         z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  accountType:   z.string().max(100).optional(),
  accountNumber: z.string().max(100).optional(),
})

export type CreateClientInput = z.infer<typeof createClientSchema>
