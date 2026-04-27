# Task: add-site-with-equipment

**UUID**: `f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c`

**Purpose**: Let users add a site's equipment in the same flow as creating the site. Right now they must create the site, find it in the table, then click "Edit Equipment" — two separate operations. After this task, site creation transitions directly into the equipment editor without leaving the card.

**Current State**: `AddSiteForm` submits via `useActionState` and shows "Site added successfully." — the user is then left to find the site in the table and click "Edit Equipment" separately.

**Desired State**:
1. User fills in site name, address, client, notes and clicks "Add Site"
2. Site is created (same server action, unchanged)
3. The card transitions to show the equipment editor for the new site, with a "Skip — add equipment later" option
4. After saving equipment (or skipping), the card resets to the empty add-site form and the new site appears in the table

Equipment is **optional** — skipping is always available. Nothing about the existing "Edit Equipment" panel in the table is changed.

## Instruction Files

- **[coding.md](./coding.md)** — Convert `AddSiteForm` to controlled form, wire up the post-creation equipment phase
- **[unit-tests.md](./unit-tests.md)** — Tests for the two-phase flow (site form → equipment editor)
- **[ui-tests.md](./ui-tests.md)** — Playwright tests for the full create + equipment workflow

## Architecture Decision

`SiteEquipmentEditor` is reused as-is — it already starts with empty state, which is correct for a brand-new site. No shared component extraction is needed.

The only file that meaningfully changes is `AddSiteForm`. The rest is test coverage.

## Related Tasks

- Depends on: `sites-menu-irrigation` (`c9e3a2f1-...`) — `SiteEquipmentEditor` must exist
- Blocks: (none)
