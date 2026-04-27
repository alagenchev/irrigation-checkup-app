# Task: site-first-inspection-form

**UUID**: `c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f`

## Goal

Redesign the "Client & Site" card on the new inspection form so that:

1. **Site comes first** — the user's first action is finding or creating a site, not entering a client name.
2. **Existing site inputs are visually grouped** — labelled sub-group so it's clear these are search inputs for existing sites.
3. **New Site mode shows a full site form** — same fields as the Add Site page (name, address, and client inline).
4. **Selecting an existing site auto-populates client fields** — greyed out / locked, but any click unlocks them all.
5. **Equipment pre-populated from selected site is greyed out** — the System Overview, Backflows, Controllers, and Zones sections are covered by a transparent overlay; clicking anywhere on that overlay unlocks them for editing.

## Current State

- Section header: "Client & Site"
- Layout: Client Name → Client Address → Client Email → SiteSelector (name + address + mode toggle)
- No locking behaviour: all fields are editable immediately after site selection

## Desired State

- Section header: "Site & Client"
- Layout: SiteSelector sub-section (grouped) → Client Name → Client Address → Client Email
- Existing mode site inputs wrapped in a "Existing Site" labelled group
- New Site mode shows site name + site address + (client name inline) unlocked
- After selecting existing site: client fields render locked (readOnly + dimmed); click → unlock
- After equipment loads from existing site: equipment sections have a lock overlay; click → unlock

## Files Changed

| File | Nature of change |
|------|-----------------|
| `app/irrigation-form.tsx` | Reorder section, add lock states, locked rendering for client + equipment |
| `app/components/site-selector.tsx` | "Existing Site" grouping styling in existing mode |

## Instruction Files

- **[coding.md](./coding.md)** — Exact changes, step-by-step
- **[unit-tests.md](./unit-tests.md)** — Unit test specs for SiteSelector update + lock logic
- **[qa.md](./qa.md)** — QA agent verification checklist
- **[status.md](./status.md)** — Phase tracking
