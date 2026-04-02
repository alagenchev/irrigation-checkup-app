import { pgTable, uuid, text, timestamp, jsonb, numeric, boolean, date, unique } from 'drizzle-orm/pg-core'

// ── Companies (tenant root) ───────────────────────────────────────────────
// Every piece of data in this app is owned by exactly one company.
// The `companyId` foreign key on every table is the multi-tenancy invariant:
// all queries MUST filter by companyId derived from the authenticated user's
// Clerk organisation. Never query or mutate data without this filter.

export const companies = pgTable('companies', {
  id:         uuid('id').primaryKey().defaultRandom(),
  clerkOrgId: text('clerk_org_id').notNull().unique(),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const companySettings = pgTable('company_settings', {
  companyId:           uuid('company_id').primaryKey().references(() => companies.id, { onDelete: 'cascade' }),
  companyName:         text('company_name').notNull().default(''),
  licenseNum:          text('license_num').notNull().default(''),
  companyAddress:      text('company_address').notNull().default(''),
  companyCityStateZip: text('company_city_state_zip').notNull().default(''),
  companyPhone:        text('company_phone').notNull().default(''),
  performedBy:         text('performed_by').notNull().default(''),
  // Cloudflare R2 — unique prefix for this company's files within the top-level app bucket
  r2CompanyBucketId:   text('r2_company_bucket_id'),
  updatedAt:           timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdateFn(() => new Date()),
})

export const clients = pgTable('clients', {
  id:            uuid('id').primaryKey().defaultRandom(),
  companyId:     uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name:          text('name').notNull(),
  address:       text('address'),
  phone:         text('phone'),
  email:         text('email'),
  accountType:   text('account_type'),
  accountNumber: text('account_number'),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const sites = pgTable('sites', {
  id:        uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name:      text('name').notNull(),
  address:   text('address'),
  clientId:  uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  notes:     text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const technicians = pgTable('technicians', {
  id:        uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name:      text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  unique('technicians_company_name_uniq').on(table.companyId, table.name),
])

export const inspectors = pgTable('inspectors', {
  id:         uuid('id').primaryKey().defaultRandom(),
  companyId:  uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  firstName:  text('first_name').notNull(),
  lastName:   text('last_name').notNull(),
  email:      text('email'),
  phone:      text('phone'),
  licenseNum: text('license_num'),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Site-level equipment (persists across visits) ─────────────────────────

export const siteControllers = pgTable('site_controllers', {
  id:           uuid('id').primaryKey().defaultRandom(),
  companyId:    uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  siteId:       uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  location:     text('location'),
  manufacturer: text('manufacturer'),
  model:        text('model'),
  sensors:      text('sensors'),
  numZones:     text('num_zones').notNull().default('0'),
  masterValve:       boolean('master_valve').notNull().default(false),
  masterValveNotes:  text('master_valve_notes'),
  notes:             text('notes'),
  createdAt:         timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const siteZones = pgTable('site_zones', {
  id:              uuid('id').primaryKey().defaultRandom(),
  companyId:       uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  siteId:          uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  controllerId:    uuid('controller_id').references(() => siteControllers.id, { onDelete: 'set null' }),
  zoneNum:         text('zone_num').notNull(),
  description:     text('description'),
  landscapeTypes:  text('landscape_types').array(),
  irrigationTypes: text('irrigation_types').array(),
  notes:           text('notes'),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const siteBackflows = pgTable('site_backflows', {
  id:           uuid('id').primaryKey().defaultRandom(),
  companyId:    uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  siteId:       uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  manufacturer: text('manufacturer'),
  type:         text('type'),
  model:        text('model'),
  size:         text('size'),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── JSONB sub-types for visit-specific snapshot data ──────────────────────

export type QuoteItemData = { id: number; location: string; item: string; description: string; price: string; qty: string }
export type ZoneIssueData = { zoneNum: string; issues: string[] }
export type ZonePhotoData = { zoneNum: string; urls: string[] }

// ── site_visits ───────────────────────────────────────────────────────────

export const siteVisits = pgTable('site_visits', {
  siteVisitId: uuid('site_visit_id').primaryKey().defaultRandom(),

  // Tenant scope — must always be filtered by this when querying
  companyId:   uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),

  // References
  siteId:      uuid('site_id').notNull().references(() => sites.id, { onDelete: 'restrict' }),
  clientId:    uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  inspectorId: uuid('inspector_id').references(() => inspectors.id, { onDelete: 'set null' }),

  // Inspection details
  datePerformed:   date('date_performed').notNull(),
  inspectionType:  text('checkup_type').notNull().default('Repair Inspection'),
  accountType:     text('account_type'),
  accountNumber:   text('account_number'),
  status:          text('status').notNull().default('New'),
  dueDate:         date('due_date'),
  repairEstimate:  numeric('repair_estimate', { precision: 10, scale: 2 }),
  inspectionNotes: text('checkup_notes'),
  internalNotes:   text('internal_notes'),

  // Irrigation system overview — auto-populated from most recent prior visit on creation
  staticPressure:      numeric('static_pressure', { precision: 6, scale: 2 }),
  backflowInstalled:   boolean('backflow_installed').notNull().default(false),
  backflowServiceable: boolean('backflow_serviceable').notNull().default(false),
  isolationValve:      boolean('isolation_valve').notNull().default(false),
  systemNotes:         text('system_notes'),

  // Visit-specific snapshot data (not auto-populated)
  zoneIssues:  jsonb('zone_issues').$type<ZoneIssueData[]>(),
  quoteItems:  jsonb('quote_items').$type<QuoteItemData[]>(),
  zonePhotos:  jsonb('zone_photos').$type<ZonePhotoData[]>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdateFn(() => new Date()),
}, (table) => [
  unique('site_visit_site_date_uniq').on(table.siteId, table.datePerformed),
])

// ── Inferred types ────────────────────────────────────────────────────────

export type Company         = typeof companies.$inferSelect
export type NewCompany      = typeof companies.$inferInsert

export type CompanySettings    = typeof companySettings.$inferSelect
export type NewCompanySettings = typeof companySettings.$inferInsert

export type Client       = typeof clients.$inferSelect
export type NewClient    = typeof clients.$inferInsert

export type Site         = typeof sites.$inferSelect
export type NewSite      = typeof sites.$inferInsert

export type Technician    = typeof technicians.$inferSelect
export type NewTechnician = typeof technicians.$inferInsert

export type Inspector    = typeof inspectors.$inferSelect
export type NewInspector = typeof inspectors.$inferInsert

export type SiteController    = typeof siteControllers.$inferSelect
export type NewSiteController = typeof siteControllers.$inferInsert

export type SiteZone    = typeof siteZones.$inferSelect
export type NewSiteZone = typeof siteZones.$inferInsert

export type SiteBackflow    = typeof siteBackflows.$inferSelect
export type NewSiteBackflow = typeof siteBackflows.$inferInsert

export type SiteVisit    = typeof siteVisits.$inferSelect
export type NewSiteVisit = typeof siteVisits.$inferInsert
