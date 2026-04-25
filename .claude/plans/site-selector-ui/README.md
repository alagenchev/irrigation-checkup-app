# Task: site-selector-ui

**UUID**: `f47ac10b-58cc-4372-a567-0e02b2c3d479`

**Purpose**: Add a site selector component to the inspection form that allows users to search and select existing sites or create new ones.

**Current State**: The inspection form has `siteName` and `siteAddress` as plain text inputs. Sites are managed separately at `/sites`.

**Desired State**: Inspection form has an interactive site selector with search, existing/new mode toggle, and site data pre-population.

## Instruction Files

- **[coding.md](./coding.md)** — Implementation plan for the SiteSelector component and form integration
- **[unit-tests.md](./unit-tests.md)** — Unit test specifications for search, mode switching, and callbacks
- **[ui-tests.md](./ui-tests.md)** — Manual/E2E testing of the site selection UX and form integration

## Related Tasks

- Depends on: (none)
- Blocks: `link-irrigation-fields`
