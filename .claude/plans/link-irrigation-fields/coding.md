# Coding Instructions: link-irrigation-fields

## Goal
Make irrigation system sections (Overview, Backflow, Controllers, Zones) visible only when a site is selected, and pre-fill them with existing equipment data from the selected site.

## Current State
- All four irrigation sections are rendered unconditionally in `app/irrigation-form.tsx`
- No mechanism to load existing site equipment
- Site selection doesn't trigger equipment loading

## Changes Required

### 1. Create Server Action: `getSiteEquipment`
**File**: `actions/sites.ts` (new function)

**Purpose**: Fetch controllers, zones, backflows, and system overview for a given site.

**Function Signature**:
```ts
export async function getSiteEquipment(siteId: string): Promise<{
  controllers: ControllerFormData[]
  zones: ZoneFormData[]
  backflows: BackflowFormData[]
  overview: {
    staticPressure: string
    backflowInstalled: boolean
    backflowServiceable: boolean
    isolationValve: boolean
    systemNotes: string
  } | null
}>
```

**Implementation**:
- Call `getRequiredCompanyId()` at top (multi-tenancy guard)
- Query `siteControllers` where `siteId = ?` and `companyId = ?`
- Query `siteZones` where `siteId = ?` and `companyId = ?`
- Query `siteBackflows` where `siteId = ?` and `companyId = ?`
- Query latest `siteVisit` for this site to get system overview fields
- Transform database rows into `ControllerFormData`, `ZoneFormData`, `BackflowFormData` shapes
- Return structured object

**Error Handling**:
- Throw error if site not found or user doesn't have access
- Return empty arrays for controllers/zones/backflows if none exist
- Return `null` for overview if no visits exist yet

### 2. Update IrrigationForm State
**File**: `app/irrigation-form.tsx` (modify)

**Changes**:
- Add state: `const [siteSelected, setSiteSelected] = useState(false)`
- Add state: `const [equipmentLoading, setEquipmentLoading] = useState(false)`
- Add state: `const [equipmentError, setEquipmentError] = useState<string | null>(null)`

**On Site Selection**:
- When `SiteSelector` calls `onSiteSelect(site)`:
  - Set `siteSelected = true`
  - Call `getSiteEquipment(site.id)` server action
  - On success: populate `controllers`, `zones`, `backflows` with loaded data
  - Populate overview fields if available
  - On error: show error message, don't block form

**On New Site Mode**:
- When switching to new site:
  - Set `siteSelected = true`
  - Clear `controllers`, `zones`, `backflows` (empty arrays)
  - Clear overview fields (use defaults)

**On Mode Switch Away**:
- When user switches back to "Select Existing Site" mode:
  - Don't clear `siteSelected` (stay true if a site is still selected)
  - Only clear equipment if user hasn't selected a site

### 3. Conditionally Render Irrigation Sections
**File**: `app/irrigation-form.tsx` (modify)

**Changes**:
- Wrap the four sections in: `{siteSelected ? (...) : <placeholder>}`
- Placeholder message: "Select or create a site to manage irrigation details"
- Show loading state while equipment is being fetched: "Loading equipment..."
- Show error message if equipment fetch fails: "Error loading equipment: {message}"

**Sections to Wrap**:
1. Irrigation System Overview (lines ~628-653)
2. Backflow Devices (lines ~655-681)
3. Controllers (lines ~683-738)
4. Zone Descriptions (lines ~740+)

### 4. Ephemeral IDs for Pre-filled Equipment
**Implementation Note** (from AGENTS.md: Form data flow):
- When loading equipment from DB (UUIDs), assign temporary ephemeral IDs (`number`)
- These allow zone FK references to work in the UI without hardcoding UUIDs
- Pattern: `equipment.map(e => ({ ...e, id: uid() }))`
- When saving, extract original UUIDs from the DB record (kept in separate field if needed)

## Type Safety

- Use existing `ControllerFormData`, `ZoneFormData`, `BackflowFormData` from `types/index.ts`
- Validate server action response with Zod if needed (or trust DB types)
- Ensure `getSiteEquipment` is properly typed with TypeScript strict mode

## Integration Points

- **Depends on**: `site-selector-ui` — must have SiteSelector component already working
- **Called by**: IrrigationForm `onSiteSelect` callback
- **Related**: Task 4 will use the same `getSiteEquipment` logic (or reuse this action)

## Success Criteria

- [ ] `getSiteEquipment` server action works correctly
- [ ] Site selection triggers equipment loading
- [ ] Equipment sections appear/disappear based on `siteSelected` state
- [ ] Pre-filled equipment data displays correctly
- [ ] New site mode clears equipment sections for fresh input
- [ ] Error handling works (shows message, doesn't crash)
- [ ] Loading state visible while fetching
- [ ] No TypeScript errors
- [ ] Existing form save logic still works with pre-filled data

## Files Modified

- `actions/sites.ts` (add `getSiteEquipment` function)
- `app/irrigation-form.tsx` (add state, conditional rendering, server action call)

## Notes

- The `getSiteEquipment` logic is similar to what's used in `getInspectionForEdit()` action
- Reuse patterns from existing codebase for consistency
- Multi-tenancy: always filter by `companyId`
