# Task: sites-menu-irrigation

**UUID**: `c9e3a2f1-6b4d-4e8a-8f2c-1d7a9e5f3b8a`

**Purpose**: Add equipment editor to the Sites page (`/sites`) so users can manage controllers, zones, and backflows directly from the sites list without doing an inspection.

**Current State**: Sites page shows a table of sites but no way to view/edit irrigation equipment.

**Desired State**: Click a site → view/edit its equipment in a side panel → save changes.

## Instruction Files

- **[coding.md](./coding.md)** — Create SiteEquipmentEditor component, update sites page layout
- **[unit-tests.md](./unit-tests.md)** — Tests for updateSiteEquipment server action and component integration
- **[ui-tests.md](./ui-tests.md)** — Manual testing of equipment editing from sites page

## Related Tasks

- Depends on: (none — can run in parallel with `link-irrigation-fields`)
- Blocks: (none)

## Notes

- Reuses equipment data structures from Task 3 (`getSiteEquipment`, etc.)
- New server action: `updateSiteEquipment` (persists equipment changes)
