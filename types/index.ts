export type {
  Client, NewClient,
  Site, NewSite,
  CompanySettings, NewCompanySettings,
  Technician, NewTechnician,
  Inspector, NewInspector,
  SiteController, NewSiteController,
  SiteZone, NewSiteZone,
  SiteBackflow, NewSiteBackflow,
  SiteVisit, NewSiteVisit,
  QuoteItemData, ZoneIssueData,
} from '@/lib/schema'

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// ── Form-specific data shapes (UI layer, not DB schema types) ─────────────────

export type ControllerFormData = {
  id: number; location: string; manufacturer: string; model: string
  sensors: string; numZones: string; masterValve: boolean; notes: string
}

export type ZoneFormData = {
  id: number; zoneNum: string; controller: string; description: string
  landscapeTypes: string[]; irrigationTypes: string[]; notes: string
}

export type BackflowFormData = {
  id: number; manufacturer: string; type: string; model: string; size: string
}

export type QuoteItemFormData = {
  id: number; location: string; item: string; description: string; price: string; qty: string
}

export type IrrigationFormFieldValues = {
  clientName: string; clientAddress: string; siteName: string; siteAddress: string
  datePerformed: string; inspectionType: string; accountType: string
  accountNumber: string; status: string; dueDate: string; inspectorId: string
  repairEstimate: string; inspectionNotes: string; internalNotes: string
  staticPressure: string; backflowInstalled: boolean; backflowServiceable: boolean
  isolationValve: boolean; systemNotes: string
}

export type IrrigationFormInitialData = {
  siteVisitId:  number
  form:         IrrigationFormFieldValues
  controllers:  ControllerFormData[]
  zones:        ZoneFormData[]
  backflows:    BackflowFormData[]
  zoneIssues:   Record<string, string[]>
  quoteItems:   QuoteItemFormData[]
}
