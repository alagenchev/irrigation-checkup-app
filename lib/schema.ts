import { pgTable, serial, text, timestamp, integer, jsonb, numeric, boolean, date, unique } from 'drizzle-orm/pg-core'

export const companySettings = pgTable('company_settings', {
  id:                  integer('id').primaryKey().default(1),
  companyName:         text('company_name').notNull().default(''),
  licenseNum:          text('license_num').notNull().default(''),
  companyAddress:      text('company_address').notNull().default(''),
  companyCityStateZip: text('company_city_state_zip').notNull().default(''),
  companyPhone:        text('company_phone').notNull().default(''),
  performedBy:         text('performed_by').notNull().default(''),
  updatedAt:           timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdateFn(() => new Date()),
})

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

export const technicians = pgTable('technicians', {
  id:        serial('id').primaryKey(),
  name:      text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Site-level equipment (persists across visits) ─────────────────────────

export const siteControllers = pgTable('site_controllers', {
  id:           serial('id').primaryKey(),
  siteId:       integer('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  location:     text('location'),
  manufacturer: text('manufacturer'),
  model:        text('model'),
  sensors:      text('sensors'),
  numZones:     text('num_zones').notNull().default('0'),
  masterValve:  boolean('master_valve').notNull().default(false),
  notes:        text('notes'),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const siteZones = pgTable('site_zones', {
  id:              serial('id').primaryKey(),
  siteId:          integer('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  controllerId:    integer('controller_id').references(() => siteControllers.id, { onDelete: 'set null' }),
  zoneNum:         text('zone_num').notNull(),
  description:     text('description'),
  landscapeTypes:  text('landscape_types').array(),
  irrigationTypes: text('irrigation_types').array(),
  notes:           text('notes'),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const siteBackflows = pgTable('site_backflows', {
  id:           serial('id').primaryKey(),
  siteId:       integer('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  manufacturer: text('manufacturer'),
  type:         text('type'),
  model:        text('model'),
  size:         text('size'),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── JSONB sub-types for visit-specific snapshot data ──────────────────────

export type QuoteItemData = { id: number; location: string; item: string; description: string; price: string; qty: string }
export type ZoneIssueData = { zoneNum: string; issues: string[] }

// ── site_visits ───────────────────────────────────────────────────────────

export const siteVisits = pgTable('site_visits', {
  siteVisitId: serial('site_visit_id').primaryKey(),

  // References
  siteId:       integer('site_id').notNull().references(() => sites.id, { onDelete: 'restrict' }),
  clientId:     integer('client_id').references(() => clients.id, { onDelete: 'set null' }),
  technicianId: integer('technician_id').references(() => technicians.id, { onDelete: 'set null' }),

  // Checkup details
  datePerformed:  date('date_performed').notNull(),
  checkupType:    text('checkup_type').notNull().default('Repair Checkup'),
  accountType:    text('account_type'),
  accountNumber:  text('account_number'),
  status:         text('status').notNull().default('New'),
  dueDate:        date('due_date'),
  repairEstimate: numeric('repair_estimate', { precision: 10, scale: 2 }),
  checkupNotes:   text('checkup_notes'),
  internalNotes:  text('internal_notes'),

  // Irrigation system overview — auto-populated from most recent prior visit on creation
  staticPressure:      numeric('static_pressure', { precision: 6, scale: 2 }),
  backflowInstalled:   boolean('backflow_installed').notNull().default(false),
  backflowServiceable: boolean('backflow_serviceable').notNull().default(false),
  isolationValve:      boolean('isolation_valve').notNull().default(false),
  systemNotes:         text('system_notes'),

  // Visit-specific snapshot data (not auto-populated)
  zoneIssues: jsonb('zone_issues').$type<ZoneIssueData[]>(),
  quoteItems: jsonb('quote_items').$type<QuoteItemData[]>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdateFn(() => new Date()),
}, (table) => [
  unique('site_visit_site_date_uniq').on(table.siteId, table.datePerformed),
])

// ── Inferred types ────────────────────────────────────────────────────────

export type CompanySettings    = typeof companySettings.$inferSelect
export type NewCompanySettings = typeof companySettings.$inferInsert

export type Client       = typeof clients.$inferSelect
export type NewClient    = typeof clients.$inferInsert

export type Site         = typeof sites.$inferSelect
export type NewSite      = typeof sites.$inferInsert

export type Technician    = typeof technicians.$inferSelect
export type NewTechnician = typeof technicians.$inferInsert

export type SiteController    = typeof siteControllers.$inferSelect
export type NewSiteController = typeof siteControllers.$inferInsert

export type SiteZone    = typeof siteZones.$inferSelect
export type NewSiteZone = typeof siteZones.$inferInsert

export type SiteBackflow    = typeof siteBackflows.$inferSelect
export type NewSiteBackflow = typeof siteBackflows.$inferInsert

export type SiteVisit    = typeof siteVisits.$inferSelect
export type NewSiteVisit = typeof siteVisits.$inferInsert
