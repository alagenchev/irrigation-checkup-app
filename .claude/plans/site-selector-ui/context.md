# context.md: site-selector-ui

**UUID**: f47ac10b-58cc-4372-a567-0e02b2c3d479

## Architecture Decisions

- **Controlled component pattern**: `SiteSelector` accepts all data as props and emits changes via callbacks — no internal state except what's managed by the child `Autocomplete` / `AddressAutocomplete` primitives.
- **Extracted pure helpers** for unit testability:
  - `siteToOption(site)` — converts `SiteWithClient` → `AutocompleteOption`; exported so tests verify the mapping.
  - `filterSites(sites, query)` — filters by name or address (case-insensitive substring); exported for unit tests without rendering.
- **`SiteSelector` delegates search display to `Autocomplete`** — the `Autocomplete` component already filters options by `label` on its own, so `filterSites` is exported for testing but `siteToOption` is what feeds the dropdown. The `Autocomplete` does its own filtering client-side.
- **Address input stays in `SiteSelector`** in both modes via `AddressAutocomplete`, so the parent form only needs `onNewAddressChange` callback.
- **Geo-location button kept in parent form** (`irrigation-form.tsx`) — it updates `siteAddress` via `setField` which flows back into `SiteSelector` via `selectedAddress` prop. This keeps the geo feature co-located with its state in the parent while preserving the pure-props pattern for `SiteSelector`.
- **Mode switching clears site name + address** when switching to 'new' mode; switching back to 'existing' mode does not re-populate (user must select again).
- **`React.ReactElement` return type** instead of `JSX.Element` — the project uses `"strict": true` TypeScript which doesn't have the global `JSX` namespace available without explicit import.
- **`full-width` wrapper class** on the site selector's outer `field` div so it spans the full grid width (same pattern as other full-width fields in the form).
- **Client name auto-population** on site select: when an existing site with a linked client is selected, `clientName` and `clientAddress` are also populated in the form (consistent with previous behavior).

## Files Created/Modified

- `app/components/site-selector.tsx` (new, 181 lines)
- `app/irrigation-form.tsx` (modified, 1050 lines — net +17 lines)

### Key changes to `irrigation-form.tsx`
- Added import: `SiteSelector` from `@/app/components/site-selector`
- Added state: `siteMode: 'existing' | 'new'`
- Added handlers: `handleSiteSelect`, `handleSiteModeChange`
- Removed `siteOptions` computed variable (moved into `SiteSelector`)
- Replaced two `<div class="field">` blocks (site name Autocomplete + site address AddressAutocomplete) with single `<div class="field full-width">` containing `<SiteSelector>`
- Geo-location button and results preserved alongside `SiteSelector`

## Test IDs (data-testid attributes)

### `app/components/site-selector.tsx`
- `site-selector` — outer wrapper div for entire component
- `site-selector-existing-mode` — container div shown in 'existing' mode
- `site-selector-mode-toggle` — button to switch between 'existing'/'new' modes (rendered in both modes)
- `site-selector-address-readonly` — readonly address input shown when `disabled=true`
- `site-selector-new-mode` — container div shown in 'new' mode
- `site-selector-new-name` — text input for entering a new site name (new mode only)
- `site-selector-new-address` — wrapper div around `AddressAutocomplete` for new site address (new mode only)

### `app/irrigation-form.tsx`
- `site-selector-wrapper` — outer `field` div containing the `SiteSelector` component
- `site-selector-geo-button` — 📍 button to trigger geolocation lookup

## Test Setup Notes

- Jest environment override required: `@jest-environment jsdom` docblock in test file (jest.config.js defaults to `node`)
- `@testing-library/jest-dom` imported directly in test file (no global setup file configured)
- `Autocomplete` and `AddressAutocomplete` mocked via `jest.mock()` — they use browser APIs (focus, debounce, external fetch) incompatible with jsdom
- Mock Autocomplete exposes:
  - `data-testid="autocomplete-input"` — the text input
  - `data-testid="autocomplete-option"` — one button per option (click triggers `onSelect`)
  - `data-testid="autocomplete-unmatched-select"` — trigger for unmatched label (tests the `if (matched)` false branch at line 71)
- Mock AddressAutocomplete exposes: `data-testid="address-autocomplete-input"`
- Duplicate-name test (CODE_REVIEW §MINOR 3): confirmed that `sites.find()` always returns first match by name; both duplicate options return SITE_A
- 100% coverage achieved; no lines excluded

## Playwright Auth Method
Using `@clerk/testing` with `setupClerkTestingToken` via shared fixture pattern. Auth fixture: `e2e/fixtures/auth.ts` extends base Playwright test fixture, calling `setupClerkTestingToken({ page })` in beforeEach. All test imports use `import { test, expect } from '../fixtures/auth'` instead of '@playwright/test', which automatically authenticates every test. No additional env vars needed — already configured in project. ✅ Confirmed working.

## Known Caveats / Coverage Exclusions
(Testing Agent writes if any lines excluded from coverage)

## QA Notes
(QA Agent writes here)
