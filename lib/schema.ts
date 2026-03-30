import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const clients = pgTable('clients', {
  id:            serial('id').primaryKey(),
  name:          text('name').notNull(),
  address:       text('address'),
  phone:         text('phone'),
  email:         text('email'),
  accountType:   text('account_type'),
  accountNumber: text('account_number'),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type Client    = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert
