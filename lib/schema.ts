import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core'

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

export const sites = pgTable('sites', {
  id:        serial('id').primaryKey(),
  name:      text('name').notNull(),
  address:   text('address'),
  clientId:  integer('client_id').references(() => clients.id, { onDelete: 'set null' }),
  notes:     text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type Client    = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert
export type Site      = typeof sites.$inferSelect
export type NewSite   = typeof sites.$inferInsert
