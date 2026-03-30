export type { Client, NewClient, Site, NewSite, CompanySettings, NewCompanySettings } from '@/lib/schema'

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }
