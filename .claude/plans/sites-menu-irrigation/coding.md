# Coding Instructions: sites-menu-irrigation

## Goal
Add an equipment editor panel to the Sites page so users can view and edit a site's controllers, zones, backflows, and system overview directly from the sites list.

## Current State
- `/sites` page shows `SitesTable` with site list only
- No way to access equipment management
- Equipment editing only available during inspection creation

## Changes Required

### 1. Create Server Action: `updateSiteEquipment`
**File**: `actions/sites.ts` (new function)

**Purpose**: Save equipment changes (controllers, zones, backflows) for a site.

**Function Signature**:
```ts
export async function updateSiteEquipment(input: {
  siteId: string
  controllers: ControllerFormData[]
  zones: ZoneFormData[]
  backflows: BackflowFormData[]
}): Promise<{ ok: true } | { ok: false; error: string }>
```

**Implementation**:
- Validate `companyId` via `getRequiredCompanyId()`
- Validate input shapes with Zod schemas
- Start transaction
- Delete existing controllers/zones/backflows for this site
- Insert new equipment
- Commit transaction
- Return success/error

**Error Handling**:
- Throw if site not found or user lacks access
- Validate equipment data (required fields, correct types)
- Return error if transaction fails

### 2. Create `SiteEquipmentEditor` Component
**File**: `app/sites/site-equipment-editor.tsx` (new)

**Responsibilities**:
- Display site info (readonly): name, address, client
- Show editable irrigation fields:
  - System Overview (static pressure, backflow flags, isolation valve, notes)
  - Controllers (add/remove with form)
  - Zones (add/remove with form)
  - Backflows (add/remove with form)
- "Save" button to persist changes
- "Cancel" button to close without saving
- Loading state while saving
- Error message if save fails

**Component Signature**:
```ts
interface SiteEquipmentEditorProps {
  site: SiteWithClient
  onClose: () => void
  onSave?: () => void
}

export function SiteEquipmentEditor(props: SiteEquipmentEditorProps): JSX.Element
```

**Reuse from Inspection Form**:
- Extract irrigation section components (Controllers, Zones, Backflows)
- Or: Copy-paste the table/form markup (avoid over-engineering at this stage)
- Use same state management pattern (useState arrays)

### 3. Update `SitesPage`
**File**: `app/sites/page.tsx` (modify)

**Changes**:
- Add state: `const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)`
- Update layout to two-column:
  - Left: `SitesTable` with "Edit Equipment" buttons
  - Right: `SiteEquipmentEditor` (if siteId selected)
- Flexbox or grid layout (check existing styles)

**UI Pattern**:
- Default: Full-width sites table
- User clicks "Edit Equipment" on a site → panel slides in on right
- User clicks "Cancel" or "Save" → panel closes
- Clicking another site → panel updates to show that site's equipment

### 4. Update `SitesTable`
**File**: `app/sites/sites-table.tsx` (modify)

**Changes**:
- Add "Edit Equipment" button/link per site row
- Button calls `onClick: () => onEditEquipment(site.id)`
- Pass callback from parent (SitesPage)

**Button Style**:
- Use existing `.btn .btn-sm` classes
- Consistent with other action buttons

## Type Safety

- Reuse `ControllerFormData`, `ZoneFormData`, `BackflowFormData` from `types/index.ts`
- Use Zod schemas from `lib/validators.ts` for validation
- Ensure `updateSiteEquipment` is properly typed

## Integration Points

- Reuses equipment structures from Task 3 (`getSiteEquipment`)
- Calls new server action `updateSiteEquipment` on save
- No changes to inspection flow (independent)

## Responsive Design

- Two-column layout on desktop
- Consider mobile: stack vertically or hide panel on small screens (optional for MVP)

## Success Criteria

- [ ] `updateSiteEquipment` server action works
- [ ] `SiteEquipmentEditor` component renders correctly
- [ ] Users can edit controllers/zones/backflows
- [ ] Save persists changes to database
- [ ] Error handling works
- [ ] No TypeScript errors
- [ ] Two-column layout is clean and usable

## Files Modified

- `actions/sites.ts` (add `updateSiteEquipment`)
- `app/sites/page.tsx` (add state and layout)
- `app/sites/sites-table.tsx` (add edit button)
- `app/sites/site-equipment-editor.tsx` (new component)

## Notes

- This task can run in parallel with Task 3 (different features)
- Both use similar equipment data structures but different contexts (inspection vs. site management)
