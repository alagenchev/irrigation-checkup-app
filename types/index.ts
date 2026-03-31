export type {
  Client, NewClient,
  Site, NewSite,
  CompanySettings, NewCompanySettings,
  Technician, NewTechnician,
  SiteController, NewSiteController,
  SiteZone, NewSiteZone,
  SiteBackflow, NewSiteBackflow,
  SiteVisit, NewSiteVisit,
  ZoneNoteData, QuoteItemData, ZoneIssueData,
} from '@/lib/schema'

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }
