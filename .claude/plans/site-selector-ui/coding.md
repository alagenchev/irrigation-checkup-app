# Coding Instructions: site-selector-ui

## Goal
Implement a searchable site selector component that allows users to select an existing site or switch to creating a new site in the inspection form.

## Current State
- `app/irrigation-form.tsx`: Has `siteName` and `siteAddress` as plain text inputs
- `app/sites/add-site-form.tsx`: Separate component on `/sites` page for site creation
- `types/index.ts`: Contains `SiteWithClient` type
- The form receives `sites` prop but doesn't use it for selection

## Changes Required

### 1. Create SiteSelector Component
**File**: `app/components/site-selector.tsx` (new)

**Responsibilities**:
- Display searchable dropdown/autocomplete for existing sites
- Show "New Site" toggle button/link
- Switch between "select existing" and "add new" modes
- Search by both site name and address
- Return selected site data via callback

**Component Signature**:
```ts
interface SiteSelectorProps {
  sites: SiteWithClient[]
  selectedSiteName: string
  selectedAddress: string
  mode: 'existing' | 'new'
  onSiteSelect: (site: SiteWithClient) => void
  onModeChange: (mode: 'existing' | 'new') => void
  onNewSiteNameChange: (name: string) => void
  onNewAddressChange: (address: string) => void
  disabled?: boolean
}

export function SiteSelector(props: SiteSelectorProps): JSX.Element
```

**Design**:
- Use existing `Autocomplete` component from `components/ui/autocomplete.tsx` for search
- Use existing `AddressAutocomplete` component from `components/ui/address-autocomplete.tsx` for address field
- Two UI states:
  - **Existing site mode**: Autocomplete dropdown + button to switch to "New Site"
  - **New site mode**: Two text inputs (site name + address) + button to switch to "Existing Site"
- Client should be able to search by typing site name or address
- When site is selected, populate callback with full `SiteWithClient` object

**Styling**: Match existing form styling (use `.field` class, `.btn` buttons, dark theme colors per AGENTS.md)

### 2. Update IrrigationForm State
**File**: `app/irrigation-form.tsx` (modify)

**Changes**:
- Add state: `const [siteMode, setSiteMode] = useState<'existing' | 'new'>('existing')`
- Update initialization logic to handle both modes
- When site is selected from existing mode:
  - Auto-populate `siteName` and `siteAddress` from selected site
  - Later: trigger loading of irrigation equipment (Task 3)
- When switching to new mode:
  - Clear `siteName` and `siteAddress`, allow manual entry
  - Keep all irrigation fields empty for new input

**Form Data Flow**:
- Old: `siteName`, `siteAddress` are free-form inputs
- New: `siteName`, `siteAddress` come from either selected site OR user input (depending on mode)
- Pass `siteMode` state to SiteSelector
- Handle callbacks: `onSiteSelect`, `onModeChange`, `onNewSiteNameChange`, `onNewAddressChange`

### 3. Update Form Rendering
**File**: `app/irrigation-form.tsx` (modify)

**Changes**:
- Locate the section where `siteName` and `siteAddress` are rendered
- Replace those text inputs with `<SiteSelector />` component
- Pass all required props from form state

**Form Section Flow**:
1. Site selector appears at top of form
2. User either selects existing site or switches to new site mode
3. Rest of form continues as before (client, inspection details, irrigation fields)

## Implementation Details

### Search Logic
- Filter `sites` array by:
  - Site name (case-insensitive substring match)
  - Site address (case-insensitive substring match)
- Display top matches as user types
- Show client name alongside site name for disambiguation

### Type Safety
- Use existing `SiteWithClient` type from `actions/sites.ts`
- No new types needed; reuse what exists
- Ensure callbacks have correct signatures

### Integration Points
- `SiteSelector` is a client component (`'use client'`)
- `IrrigationForm` is already a client component
- No server actions needed for this task (just UI + state management)
- Related server action `getSiteEquipment` will be added in Task 3

## Success Criteria
- [ ] SiteSelector component compiles and renders without errors
- [ ] Search filters sites by name and address correctly
- [ ] Mode toggle switches between existing/new views
- [ ] Selected site populates form fields correctly
- [ ] New site mode allows free-form name/address entry
- [ ] Component integrates into IrrigationForm without breaking existing functionality
- [ ] TypeScript strict mode: no `any` types, all props typed correctly
- [ ] Disabled state works (when form is readonly)

## Files Modified
- `app/components/site-selector.tsx` (new)
- `app/irrigation-form.tsx` (modified)

## Testing Considerations
- Component works with empty sites list
- Search works with partial matches
- Mode switching preserves form state
- Site selection updates form correctly
- Accessibility: keyboard navigation, screen reader friendly
- See: `unit-tests.md` for detailed test specifications
