# Task: link-irrigation-fields

**UUID**: `8f5d8c1a-7b2e-4f3a-9c6d-2e1a5f8b3c2d`

**Purpose**: Load and display irrigation system equipment when a site is selected, making the Overview/Backflow/Controllers/Zones sections visible and pre-filled with existing site data.

**Current State**: Irrigation sections are always visible, not connected to site selection, and don't pre-fill from existing sites.

**Desired State**: Select a site → sections appear with pre-filled equipment data from that site.

## Instruction Files

- **[coding.md](./coding.md)** — Implementation of equipment loading and conditional rendering
- **[unit-tests.md](./unit-tests.md)** — Tests for getSiteEquipment server action and form state updates
- **[ui-tests.md](./ui-tests.md)** — Manual testing of site selection → equipment pre-fill flow

## Related Tasks

- Depends on: `site-selector-ui`
- Blocks: (none)
