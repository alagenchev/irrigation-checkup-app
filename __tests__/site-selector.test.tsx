/**
 * @jest-environment jsdom
 *
 * Unit tests for:
 *   - siteToOption() — pure mapping function
 *   - filterSites()  — pure filter function
 *   - SiteSelector   — controlled component
 *
 * Task: site-selector-ui (f47ac10b-58cc-4372-a567-0e02b2c3d479)
 */

import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { siteToOption, filterSites, SiteSelector } from '@/app/components/site-selector'
import type { SiteWithClient } from '@/actions/sites'
import type { AutocompleteOption } from '@/components/ui/autocomplete'

// ── Mocks ──────────────────────────────────────────────────────────────────────
// Autocomplete and AddressAutocomplete use browser APIs (focus, debounce, fetch).
// We replace them with minimal test doubles that expose the data-testid attributes
// the SiteSelector component itself uses, plus enough interactivity to trigger the
// callbacks under test.

jest.mock('@/components/ui/autocomplete', () => ({
  Autocomplete: ({
    value,
    onChange,
    onSelect,
    options,
    disabled,
    placeholder,
  }: {
    value: string
    onChange: (v: string) => void
    onSelect?: (opt: AutocompleteOption) => void
    options: AutocompleteOption[]
    disabled?: boolean
    placeholder?: string
  }) => (
    <div>
      <input
        data-testid="autocomplete-input"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
      {options.map(opt => (
        <button
          key={`${opt.label}::${opt.address ?? ''}`}
          data-testid="autocomplete-option"
          onMouseDown={() => onSelect?.(opt)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
      {/* Escape hatch: trigger onSelect with a label that has no matching site */}
      <button
        data-testid="autocomplete-unmatched-select"
        onMouseDown={() => onSelect?.({ label: '__NO_MATCH__' })}
        type="button"
      >
        trigger unmatched
      </button>
    </div>
  ),
}))

jest.mock('@/components/ui/address-autocomplete', () => ({
  AddressAutocomplete: ({
    value,
    onChange,
    disabled,
    placeholder,
  }: {
    value: string
    onChange: (v: string) => void
    disabled?: boolean
    placeholder?: string
  }) => (
    <input
      data-testid="address-autocomplete-input"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
    />
  ),
}))

// ── Test Data ─────────────────────────────────────────────────────────────────

const SITE_A: SiteWithClient = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  companyId: 'company-1',
  name: 'Acme HQ – Building A',
  address: '123 Main St, Denver, CO',
  clientId: 'client-1',
  clientName: 'Acme Corp',
  clientAddress: '100 Corporate Way',
  notes: 'Front entrance',
  createdAt: new Date('2026-01-01'),
}

const SITE_B: SiteWithClient = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  companyId: 'company-1',
  name: 'Acme HQ – Building B',
  address: '125 Main St, Denver, CO',
  clientId: 'client-1',
  clientName: 'Acme Corp',
  clientAddress: '100 Corporate Way',
  notes: 'Back parking lot',
  createdAt: new Date('2026-01-01'),
}

const SITE_C: SiteWithClient = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  companyId: 'company-1',
  name: 'Sunrise Park',
  address: '999 Elm Ave, Boulder, CO',
  clientId: 'client-2',
  clientName: 'City Parks Dept',
  clientAddress: '200 City Hall Dr',
  notes: null,
  createdAt: new Date('2026-01-02'),
}

// Site with null optional fields
const SITE_NO_CLIENT: SiteWithClient = {
  id: '550e8400-e29b-41d4-a716-446655440003',
  companyId: 'company-1',
  name: 'Standalone Site',
  address: null,
  clientId: null,
  clientName: null,
  clientAddress: null,
  notes: null,
  createdAt: new Date('2026-01-03'),
}

// Duplicate-name site (CODE_REVIEW.md flagged: sites.find(s => s.name === opt.label) picks first match)
const SITE_DUPLICATE: SiteWithClient = {
  id: '550e8400-e29b-41d4-a716-446655440004',
  companyId: 'company-1',
  name: 'Acme HQ – Building A',   // same name as SITE_A, different address
  address: '500 Other Blvd, Ft Collins, CO',
  clientId: 'client-3',
  clientName: 'Other Corp',
  clientAddress: '300 Other Way',
  notes: null,
  createdAt: new Date('2026-01-04'),
}

const MOCK_SITES: SiteWithClient[] = [SITE_A, SITE_B, SITE_C]

// ── Default props factory ─────────────────────────────────────────────────────

function defaultProps(overrides: Partial<Parameters<typeof SiteSelector>[0]> = {}) {
  return {
    sites: MOCK_SITES,
    selectedSiteName: '',
    selectedAddress: '',
    mode: 'existing' as const,
    onSiteSelect: jest.fn(),
    onModeChange: jest.fn(),
    onNewSiteNameChange: jest.fn(),
    onNewAddressChange: jest.fn(),
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helper: siteToOption
// ─────────────────────────────────────────────────────────────────────────────

describe('siteToOption()', () => {
  it('maps site name to label', () => {
    const opt = siteToOption(SITE_A)
    expect(opt.label).toBe('Acme HQ – Building A')
  })

  it('maps site address to address', () => {
    const opt = siteToOption(SITE_A)
    expect(opt.address).toBe('123 Main St, Denver, CO')
  })

  it('maps clientName to clientName', () => {
    const opt = siteToOption(SITE_A)
    expect(opt.clientName).toBe('Acme Corp')
  })

  it('maps clientAddress to clientAddress', () => {
    const opt = siteToOption(SITE_A)
    expect(opt.clientAddress).toBe('100 Corporate Way')
  })

  it('converts null address to undefined', () => {
    const opt = siteToOption(SITE_NO_CLIENT)
    expect(opt.address).toBeUndefined()
  })

  it('converts null clientName to undefined', () => {
    const opt = siteToOption(SITE_NO_CLIENT)
    expect(opt.clientName).toBeUndefined()
  })

  it('converts null clientAddress to undefined', () => {
    const opt = siteToOption(SITE_NO_CLIENT)
    expect(opt.clientAddress).toBeUndefined()
  })

  it('returns correct shape for a fully populated site', () => {
    const opt = siteToOption(SITE_C)
    expect(opt).toEqual({
      label: 'Sunrise Park',
      value: '550e8400-e29b-41d4-a716-446655440002',
      address: '999 Elm Ave, Boulder, CO',
      clientName: 'City Parks Dept',
      clientAddress: '200 City Hall Dr',
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Pure helper: filterSites
// ─────────────────────────────────────────────────────────────────────────────

describe('filterSites()', () => {
  it('returns all sites when query is empty string', () => {
    expect(filterSites(MOCK_SITES, '')).toEqual(MOCK_SITES)
  })

  it('returns all sites when query is only whitespace', () => {
    expect(filterSites(MOCK_SITES, '   ')).toEqual(MOCK_SITES)
  })

  it('filters by name (case-insensitive, lowercase query)', () => {
    const result = filterSites(MOCK_SITES, 'acme')
    expect(result).toHaveLength(2)
    expect(result.map(s => s.id)).toContain(SITE_A.id)
    expect(result.map(s => s.id)).toContain(SITE_B.id)
  })

  it('filters by name (case-insensitive, UPPERCASE query)', () => {
    const result = filterSites(MOCK_SITES, 'ACME')
    expect(result).toHaveLength(2)
  })

  it('filters by name partial match', () => {
    const result = filterSites(MOCK_SITES, 'Sunrise')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(SITE_C.id)
  })

  it('filters by address (case-insensitive)', () => {
    const result = filterSites(MOCK_SITES, 'boulder')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(SITE_C.id)
  })

  it('filters by partial address match', () => {
    // Both SITE_A and SITE_B have "Main St, Denver"
    const result = filterSites(MOCK_SITES, 'Denver')
    expect(result).toHaveLength(2)
  })

  it('returns empty array when no match', () => {
    const result = filterSites(MOCK_SITES, 'xyz-no-match-999')
    expect(result).toHaveLength(0)
  })

  it('handles empty sites array', () => {
    const result = filterSites([], 'acme')
    expect(result).toEqual([])
  })

  it('handles site with null address (does not throw)', () => {
    const sitesWithNull = [SITE_NO_CLIENT]
    expect(() => filterSites(sitesWithNull, 'anything')).not.toThrow()
    const result = filterSites(sitesWithNull, 'Standalone')
    expect(result).toHaveLength(1)
  })

  it('treats null address as empty string for matching purposes', () => {
    // Querying for an address substring should not match a null-address site
    const result = filterSites([SITE_NO_CLIENT], 'Main St')
    expect(result).toHaveLength(0)
  })

  it('handles special characters in query', () => {
    // SITE_A has an em-dash in its name
    const result = filterSites(MOCK_SITES, '–')
    expect(result).toHaveLength(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Component: SiteSelector — Rendering & UI State
// ─────────────────────────────────────────────────────────────────────────────

describe('SiteSelector component', () => {
  describe('Rendering — existing mode', () => {
    it('renders the outer wrapper with data-testid="site-selector"', () => {
      render(<SiteSelector {...defaultProps()} />)
      expect(screen.getByTestId('site-selector')).toBeInTheDocument()
    })

    it('renders the existing-mode container in existing mode', () => {
      render(<SiteSelector {...defaultProps()} />)
      expect(screen.getByTestId('site-selector-existing-mode')).toBeInTheDocument()
    })

    it('does NOT render the new-mode container in existing mode', () => {
      render(<SiteSelector {...defaultProps()} />)
      expect(screen.queryByTestId('site-selector-new-mode')).not.toBeInTheDocument()
    })

    it('renders the mode-toggle button with label "+ New Site" in existing mode', () => {
      render(<SiteSelector {...defaultProps()} />)
      const toggleBtn = screen.getByTestId('site-selector-mode-toggle')
      expect(toggleBtn).toBeInTheDocument()
      expect(toggleBtn).toHaveTextContent('+ New Site')
    })

    it('renders "Site Name" label in existing mode', () => {
      render(<SiteSelector {...defaultProps()} />)
      expect(screen.getByText(/Site Name/i)).toBeInTheDocument()
    })

    it('renders address autocomplete (not readonly) in existing mode when not disabled', () => {
      render(<SiteSelector {...defaultProps()} />)
      expect(screen.getByTestId('address-autocomplete-input')).toBeInTheDocument()
      expect(screen.queryByTestId('site-selector-address-readonly')).not.toBeInTheDocument()
    })

    it('passes selectedSiteName to the Autocomplete input', () => {
      render(<SiteSelector {...defaultProps({ selectedSiteName: 'Acme HQ – Building A' })} />)
      expect(screen.getByTestId('autocomplete-input')).toHaveValue('Acme HQ – Building A')
    })

    it('passes selectedAddress to the AddressAutocomplete input', () => {
      render(<SiteSelector {...defaultProps({ selectedAddress: '123 Main St' })} />)
      expect(screen.getByTestId('address-autocomplete-input')).toHaveValue('123 Main St')
    })

    it('renders one autocomplete option per site', () => {
      render(<SiteSelector {...defaultProps()} />)
      const options = screen.getAllByTestId('autocomplete-option')
      expect(options).toHaveLength(MOCK_SITES.length)
    })

    it('renders empty site list gracefully (no options)', () => {
      render(<SiteSelector {...defaultProps({ sites: [] })} />)
      expect(screen.queryAllByTestId('autocomplete-option')).toHaveLength(0)
    })
  })

  describe('Rendering — new mode', () => {
    it('renders the new-mode container when mode="new"', () => {
      render(<SiteSelector {...defaultProps({ mode: 'new' })} />)
      expect(screen.getByTestId('site-selector-new-mode')).toBeInTheDocument()
    })

    it('does NOT render the existing-mode container when mode="new"', () => {
      render(<SiteSelector {...defaultProps({ mode: 'new' })} />)
      expect(screen.queryByTestId('site-selector-existing-mode')).not.toBeInTheDocument()
    })

    it('renders mode-toggle button with label "Select Existing" in new mode', () => {
      render(<SiteSelector {...defaultProps({ mode: 'new' })} />)
      const toggleBtn = screen.getByTestId('site-selector-mode-toggle')
      expect(toggleBtn).toHaveTextContent('Select Existing')
    })

    it('renders the new site name input (data-testid="site-selector-new-name")', () => {
      render(<SiteSelector {...defaultProps({ mode: 'new' })} />)
      expect(screen.getByTestId('site-selector-new-name')).toBeInTheDocument()
    })

    it('passes selectedSiteName to the new-name input', () => {
      render(<SiteSelector {...defaultProps({ mode: 'new', selectedSiteName: 'My New Site' })} />)
      expect(screen.getByTestId('site-selector-new-name')).toHaveValue('My New Site')
    })

    it('renders the new-address wrapper (data-testid="site-selector-new-address") when not disabled', () => {
      render(<SiteSelector {...defaultProps({ mode: 'new' })} />)
      expect(screen.getByTestId('site-selector-new-address')).toBeInTheDocument()
    })

    it('renders AddressAutocomplete inside new-address wrapper', () => {
      render(<SiteSelector {...defaultProps({ mode: 'new' })} />)
      expect(screen.getByTestId('address-autocomplete-input')).toBeInTheDocument()
    })
  })

  describe('Disabled state', () => {
    it('hides the mode-toggle button when disabled=true (existing mode)', () => {
      render(<SiteSelector {...defaultProps({ disabled: true })} />)
      expect(screen.queryByTestId('site-selector-mode-toggle')).not.toBeInTheDocument()
    })

    it('hides the mode-toggle button when disabled=true (new mode)', () => {
      render(<SiteSelector {...defaultProps({ mode: 'new', disabled: true })} />)
      expect(screen.queryByTestId('site-selector-mode-toggle')).not.toBeInTheDocument()
    })

    it('renders readonly address input when disabled=true in existing mode', () => {
      render(<SiteSelector {...defaultProps({ disabled: true, selectedAddress: '123 Main St' })} />)
      expect(screen.getByTestId('site-selector-address-readonly')).toBeInTheDocument()
      expect(screen.queryByTestId('address-autocomplete-input')).not.toBeInTheDocument()
    })

    it('renders readonly address input when disabled=true in new mode', () => {
      render(
        <SiteSelector {...defaultProps({ mode: 'new', disabled: true, selectedAddress: '456 Elm Ave' })} />,
      )
      expect(screen.getByTestId('site-selector-address-readonly')).toBeInTheDocument()
      expect(screen.queryByTestId('address-autocomplete-input')).not.toBeInTheDocument()
    })

    it('readonly address input shows selectedAddress value', () => {
      render(<SiteSelector {...defaultProps({ disabled: true, selectedAddress: '123 Main St' })} />)
      expect(screen.getByTestId('site-selector-address-readonly')).toHaveValue('123 Main St')
    })

    it('disables the Autocomplete input when disabled=true', () => {
      render(<SiteSelector {...defaultProps({ disabled: true })} />)
      expect(screen.getByTestId('autocomplete-input')).toBeDisabled()
    })

    it('disables the new site name input when disabled=true', () => {
      render(<SiteSelector {...defaultProps({ mode: 'new', disabled: true })} />)
      expect(screen.getByTestId('site-selector-new-name')).toBeDisabled()
    })
  })

  describe('Mode toggle callbacks', () => {
    it('calls onModeChange("new") when mode-toggle is clicked in existing mode', () => {
      const onModeChange = jest.fn()
      render(<SiteSelector {...defaultProps({ onModeChange })} />)
      fireEvent.click(screen.getByTestId('site-selector-mode-toggle'))
      expect(onModeChange).toHaveBeenCalledTimes(1)
      expect(onModeChange).toHaveBeenCalledWith('new')
    })

    it('calls onModeChange("existing") when mode-toggle is clicked in new mode', () => {
      const onModeChange = jest.fn()
      render(<SiteSelector {...defaultProps({ mode: 'new', onModeChange })} />)
      fireEvent.click(screen.getByTestId('site-selector-mode-toggle'))
      expect(onModeChange).toHaveBeenCalledTimes(1)
      expect(onModeChange).toHaveBeenCalledWith('existing')
    })

    it('does not call onModeChange when component is rendered (no spurious calls)', () => {
      const onModeChange = jest.fn()
      render(<SiteSelector {...defaultProps({ onModeChange })} />)
      expect(onModeChange).not.toHaveBeenCalled()
    })
  })

  describe('Site selection', () => {
    it('calls onSiteSelect with the matching SiteWithClient when an option is selected', () => {
      const onSiteSelect = jest.fn()
      render(<SiteSelector {...defaultProps({ onSiteSelect })} />)
      // Our mock renders option buttons; clicking one triggers onSelect on Autocomplete
      const options = screen.getAllByTestId('autocomplete-option')
      fireEvent.mouseDown(options[0]) // first option = SITE_A
      expect(onSiteSelect).toHaveBeenCalledTimes(1)
      expect(onSiteSelect).toHaveBeenCalledWith(SITE_A)
    })

    it('calls onSiteSelect with the correct site when second option is selected', () => {
      const onSiteSelect = jest.fn()
      render(<SiteSelector {...defaultProps({ onSiteSelect })} />)
      const options = screen.getAllByTestId('autocomplete-option')
      fireEvent.mouseDown(options[1]) // second option = SITE_B
      expect(onSiteSelect).toHaveBeenCalledWith(SITE_B)
    })

    it('calls onSiteSelect only once per click (no duplicate calls)', () => {
      const onSiteSelect = jest.fn()
      render(<SiteSelector {...defaultProps({ onSiteSelect })} />)
      const options = screen.getAllByTestId('autocomplete-option')
      fireEvent.mouseDown(options[0])
      expect(onSiteSelect).toHaveBeenCalledTimes(1)
    })

    it('does NOT call onSiteSelect when autocomplete emits a label that has no matching site', () => {
      // Edge case: handleSiteAutocompleteSelect finds no match → if (matched) guard prevents call.
      // The mock exposes a "trigger unmatched" button that fires onSelect({label: '__NO_MATCH__'}).
      const onSiteSelect = jest.fn()
      render(<SiteSelector {...defaultProps({ onSiteSelect })} />)
      fireEvent.mouseDown(screen.getByTestId('autocomplete-unmatched-select'))
      expect(onSiteSelect).not.toHaveBeenCalled()
    })

    it('handles duplicate site names — first matching site is returned', () => {
      // CODE_REVIEW.md §MINOR 3: sites.find(s => s.name === opt.label) picks first match.
      // When two sites share the same name, the first one in the array is always selected.
      const onSiteSelect = jest.fn()
      const sitesWithDuplicate = [SITE_A, SITE_DUPLICATE, SITE_C]
      render(<SiteSelector {...defaultProps({ sites: sitesWithDuplicate, onSiteSelect })} />)
      const options = screen.getAllByTestId('autocomplete-option')
      // Both SITE_A and SITE_DUPLICATE have label "Acme HQ – Building A".
      // options[0] is SITE_A's option, options[1] is SITE_DUPLICATE's option.
      // Clicking either triggers onSelect({label: 'Acme HQ – Building A'}).
      // find() returns the FIRST match (SITE_A) regardless.
      fireEvent.mouseDown(options[0])
      expect(onSiteSelect).toHaveBeenCalledWith(SITE_A) // first match wins

      onSiteSelect.mockClear()
      // Clicking the duplicate option also returns SITE_A (first match by name)
      fireEvent.mouseDown(options[1])
      expect(onSiteSelect).toHaveBeenCalledWith(SITE_A)
    })
  })

  describe('New site name callback', () => {
    it('calls onNewSiteNameChange when user types in the Autocomplete input (existing mode)', () => {
      const onNewSiteNameChange = jest.fn()
      render(<SiteSelector {...defaultProps({ onNewSiteNameChange })} />)
      fireEvent.change(screen.getByTestId('autocomplete-input'), { target: { value: 'New Name' } })
      expect(onNewSiteNameChange).toHaveBeenCalledWith('New Name')
    })

    it('calls onNewSiteNameChange when user types in the new-name input (new mode)', () => {
      const onNewSiteNameChange = jest.fn()
      render(<SiteSelector {...defaultProps({ mode: 'new', onNewSiteNameChange })} />)
      fireEvent.change(screen.getByTestId('site-selector-new-name'), { target: { value: 'My Park' } })
      expect(onNewSiteNameChange).toHaveBeenCalledWith('My Park')
    })

    it('calls onNewSiteNameChange with empty string when input is cleared', () => {
      const onNewSiteNameChange = jest.fn()
      render(
        <SiteSelector {...defaultProps({ mode: 'new', selectedSiteName: 'Old Name', onNewSiteNameChange })} />,
      )
      fireEvent.change(screen.getByTestId('site-selector-new-name'), { target: { value: '' } })
      expect(onNewSiteNameChange).toHaveBeenCalledWith('')
    })
  })

  describe('Address change callback', () => {
    it('calls onNewAddressChange when address changes in existing mode', () => {
      const onNewAddressChange = jest.fn()
      render(<SiteSelector {...defaultProps({ onNewAddressChange })} />)
      fireEvent.change(screen.getByTestId('address-autocomplete-input'), {
        target: { value: '456 Oak Blvd' },
      })
      expect(onNewAddressChange).toHaveBeenCalledWith('456 Oak Blvd')
    })

    it('calls onNewAddressChange when address changes in new mode', () => {
      const onNewAddressChange = jest.fn()
      render(<SiteSelector {...defaultProps({ mode: 'new', onNewAddressChange })} />)
      fireEvent.change(screen.getByTestId('address-autocomplete-input'), {
        target: { value: '789 Pine Rd' },
      })
      expect(onNewAddressChange).toHaveBeenCalledWith('789 Pine Rd')
    })
  })

  describe('Existing Site group label', () => {
    it('renders an "Existing Site" group label in existing mode', () => {
      render(<SiteSelector {...defaultProps()} />)
      expect(screen.getByText(/existing site/i)).toBeInTheDocument()
    })

    it('does NOT render "Existing Site" label in new mode', () => {
      render(<SiteSelector {...defaultProps({ mode: 'new' })} />)
      expect(screen.queryByText(/existing site/i)).not.toBeInTheDocument()
    })

    it('+ New Site toggle button is inside the existing-mode group', () => {
      render(<SiteSelector {...defaultProps()} />)
      const existingMode = screen.getByTestId('site-selector-existing-mode')
      expect(existingMode).toContainElement(screen.getByTestId('site-selector-mode-toggle'))
    })
  })

  describe('Edge cases', () => {
    it('renders correctly with sites with long names', () => {
      const longNameSite: SiteWithClient = {
        ...SITE_A,
        name: 'A'.repeat(200),
        address: 'B'.repeat(300),
      }
      render(<SiteSelector {...defaultProps({ sites: [longNameSite] })} />)
      expect(screen.getByTestId('site-selector')).toBeInTheDocument()
    })

    it('renders correctly with sites that have null clientName (no crash)', () => {
      render(<SiteSelector {...defaultProps({ sites: [SITE_NO_CLIENT] })} />)
      expect(screen.getAllByTestId('autocomplete-option')).toHaveLength(1)
    })

    it('renders correctly when sites array is empty', () => {
      render(<SiteSelector {...defaultProps({ sites: [] })} />)
      expect(screen.getByTestId('site-selector')).toBeInTheDocument()
      expect(screen.queryAllByTestId('autocomplete-option')).toHaveLength(0)
    })
  })
})
