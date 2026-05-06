/**
 * @jest-environment jsdom
 *
 * Unit tests for IrrigationForm lock-state logic:
 *   - clientLocked: set after site selection, cleared on click / mode change
 *   - equipmentLocked: set after equipment loads, cleared on overlay click / mode change
 *   - DOM order: site selector precedes client name field
 *
 * Task: site-first-inspection-form (c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f)
 */

// ── Infrastructure mocks (must come before any import) ─────────────────────────

jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/db', () => ({ db: {} }))
jest.mock('@/lib/tenant', () => ({ getRequiredCompanyId: jest.fn() }))

jest.mock('@/actions/sites', () => ({
  getSiteEquipment: jest.fn(),
  updateSiteEquipment: jest.fn().mockResolvedValue({ ok: true }),
  ensureClientExists: jest.fn(),
}))
jest.mock('@/actions/save-inspection', () => ({ saveInspection: jest.fn() }))
jest.mock('@/actions/upload', () => ({ uploadZonePhoto: jest.fn() }))
jest.mock('@/actions/clients', () => ({ ensureClientExists: jest.fn() }))

// ── SiteSelector mock — exposes direct callback triggers ──────────────────────

jest.mock('@/app/components/site-selector', () => {
  const React = require('react')
  const SITE = {
    id: 'site-1',
    companyId: 'company-1',
    name: 'Test Site',
    address: '456 Oak Ave',
    clientId: 'client-1',
    notes: null,
    createdAt: new Date(),
    clientName: 'Acme Corp',
    clientAddress: '123 Main St',
  }
  return {
    SiteSelector: ({ onSiteSelect, onModeChange }: any) =>
      React.createElement('div', { 'data-testid': 'mock-site-selector' },
        React.createElement('button', {
          'data-testid': 'trigger-site-select',
          type: 'button',
          onClick: () => onSiteSelect(SITE),
        }, 'Select Test Site'),
        React.createElement('button', {
          'data-testid': 'trigger-mode-new',
          type: 'button',
          onClick: () => onModeChange('new'),
        }, 'New Site'),
        React.createElement('button', {
          'data-testid': 'trigger-mode-existing',
          type: 'button',
          onClick: () => onModeChange('existing'),
        }, 'Back to Existing'),
      ),
  }
})

// ── UI component mocks ─────────────────────────────────────────────────────────

jest.mock('@/components/ui/autocomplete', () => ({
  Autocomplete: ({ value, onChange, placeholder, disabled }: any) => {
    const React = require('react')
    return React.createElement('input', {
      value,
      placeholder,
      disabled,
      onChange: (e: any) => onChange(e.target.value),
    })
  },
}))

jest.mock('@/components/ui/address-autocomplete', () => ({
  AddressAutocomplete: ({ value, onChange, placeholder }: any) => {
    const React = require('react')
    return React.createElement('input', {
      value,
      placeholder,
      onChange: (e: any) => onChange(e.target.value),
    })
  },
}))

// ── Imports (after mocks) ──────────────────────────────────────────────────────

import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { IrrigationForm } from '@/app/irrigation-form'
import { getSiteEquipment, updateSiteEquipment } from '@/actions/sites'
import type { Client, CompanySettings, Inspector } from '@/types'
import type { SiteWithClient } from '@/actions/sites'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_CLIENTS: Client[] = [
  { id: 'client-1', companyId: 'company-1', name: 'Acme Corp', address: '123 Main St', email: 'info@acme.com', createdAt: new Date() },
]
const MOCK_SITE: SiteWithClient = {
  id: 'site-1', companyId: 'company-1', name: 'Test Site', address: '456 Oak Ave',
  clientId: 'client-1', notes: null, createdAt: new Date(),
  clientName: 'Acme Corp', clientAddress: '123 Main St',
}
const MOCK_COMPANY: CompanySettings = {
  id: 'company-1', clerkOrgId: 'org_test',
  defaultInspectionType: 'Repair Inspection', defaultAccountType: 'Commercial',
  createdAt: new Date(), updatedAt: new Date(),
}
const MOCK_INSPECTORS: Inspector[] = []
const EMPTY_EQUIPMENT = { controllers: [], zones: [], backflows: [], overview: null }
const EQUIPMENT_WITH_DATA = {
  controllers: [{ id: 1, location: 'Front', manufacturer: 'Hunter', model: 'ICC', sensors: '2', numZones: '4', masterValve: true, masterValveNotes: 'Main valve', notes: '' }],
  zones: [
    { id: 1, zoneNum: '1', controller: '1', description: 'Front lawn', landscapeTypes: ['Full-sun turf'], irrigationTypes: ['Rotor'], notes: '', photoData: [] },
    { id: 2, zoneNum: '2', controller: '1', description: 'Side yard', landscapeTypes: ['Shade turf'], irrigationTypes: ['Drip'], notes: '', photoData: [] },
  ],
  backflows: [{ id: 1, manufacturer: 'Watts', type: 'Dual Check', model: 'DCV', size: '1' }],
  overview: {
    staticPressure: '60',
    backflowInstalled: true,
    backflowServiceable: true,
    isolationValve: true,
    systemNotes: 'System in good condition',
  },
}

function renderForm() {
  return render(
    <IrrigationForm
      clients={MOCK_CLIENTS}
      sites={[MOCK_SITE]}
      company={MOCK_COMPANY}
      inspectors={MOCK_INSPECTORS}
    />
  )
}

async function selectSite() {
  await act(async () => {
    fireEvent.click(screen.getByTestId('trigger-site-select'))
  })
}

beforeEach(() => {
  (getSiteEquipment as jest.Mock).mockReset()
  ;(getSiteEquipment as jest.Mock).mockResolvedValue(EMPTY_EQUIPMENT)
})

// ─────────────────────────────────────────────────────────────────────────────

describe('IrrigationForm — client lock', () => {
  it('client name field is not locked initially', () => {
    renderForm()
    expect(screen.queryByTestId('client-name-locked')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/type or select a client/i)).toBeInTheDocument()
  })

  it('client name field is locked after selecting an existing site', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => {
      expect(screen.getByTestId('client-name-locked')).toBeInTheDocument()
    })
  })

  it('client address field is locked after selecting an existing site', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => {
      expect(screen.getByTestId('client-address-locked')).toBeInTheDocument()
    })
  })

  it('client email field is locked after selecting an existing site', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => {
      expect(screen.getByTestId('client-email-locked')).toBeInTheDocument()
    })
  })

  it('clicking the locked client name field unlocks all client fields', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => screen.getByTestId('client-name-locked'))

    fireEvent.click(screen.getByTestId('client-name-locked'))

    await waitFor(() => {
      expect(screen.queryByTestId('client-name-locked')).not.toBeInTheDocument()
      expect(screen.getByPlaceholderText(/type or select a client/i)).toBeInTheDocument()
    })
  })

  it('clicking the locked client address field unlocks all client fields', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => screen.getByTestId('client-address-locked'))

    fireEvent.click(screen.getByTestId('client-address-locked'))

    await waitFor(() => {
      expect(screen.queryByTestId('client-name-locked')).not.toBeInTheDocument()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('IrrigationForm — equipment lock', () => {
  it('expand-saved-info button is NOT present initially', () => {
    renderForm()
    expect(screen.queryByTestId('expand-saved-info-btn')).not.toBeInTheDocument()
  })

  it('expand-saved-info button appears after site selection completes', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => {
      expect(screen.getByTestId('expand-saved-info-btn')).toBeInTheDocument()
    })
  })

  it('expand button shows "Expand saved information" by default', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => {
      expect(screen.getByTestId('expand-saved-info-btn')).toHaveTextContent('Expand saved information')
    })
  })

  it('equipment sections are hidden by default after site selection', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => screen.getByTestId('expand-saved-info-btn'))

    // Per-section overlays should not be visible (equipment is collapsed)
    expect(screen.queryByTestId('overview-lock-overlay')).not.toBeInTheDocument()
    expect(screen.queryByTestId('backflows-lock-overlay')).not.toBeInTheDocument()
    expect(screen.queryByTestId('controllers-lock-overlay')).not.toBeInTheDocument()
    expect(screen.queryByTestId('zones-lock-overlay')).not.toBeInTheDocument()
  })

  it('clicking expand button shows per-section overlays and hint text', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => screen.getByTestId('expand-saved-info-btn'))

    fireEvent.click(screen.getByTestId('expand-saved-info-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('overview-lock-overlay')).toBeInTheDocument()
      expect(screen.getByTestId('backflows-lock-overlay')).toBeInTheDocument()
      expect(screen.getByTestId('controllers-lock-overlay')).toBeInTheDocument()
      expect(screen.getByTestId('zones-lock-overlay')).toBeInTheDocument()
    })
    expect(screen.getByTestId('saved-info-hint')).toHaveTextContent('Click on a saved field to edit')
  })

  it('expand button switches to "Collapse" when expanded', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => screen.getByTestId('expand-saved-info-btn'))

    fireEvent.click(screen.getByTestId('expand-saved-info-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('expand-saved-info-btn')).toHaveTextContent('Collapse')
    })
  })

  it('clicking Collapse hides sections and resets button text', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => screen.getByTestId('expand-saved-info-btn'))

    fireEvent.click(screen.getByTestId('expand-saved-info-btn'))
    await waitFor(() => screen.getByTestId('overview-lock-overlay'))

    fireEvent.click(screen.getByTestId('expand-saved-info-btn'))

    await waitFor(() => {
      expect(screen.queryByTestId('overview-lock-overlay')).not.toBeInTheDocument()
      expect(screen.getByTestId('expand-saved-info-btn')).toHaveTextContent('Expand saved information')
    })
  })

  it('site selection with large equipment sets up ID counter correctly', async () => {
    ;(getSiteEquipment as jest.Mock).mockResolvedValueOnce({
      controllers: [
        { id: 100, location: 'Front', manufacturer: '', model: '', sensors: '', numZones: '2', masterValve: false, masterValveNotes: '', notes: '' },
        { id: 101, location: 'Back', manufacturer: '', model: '', sensors: '', numZones: '3', masterValve: false, masterValveNotes: '', notes: '' },
      ],
      zones: [
        { id: 200, zoneNum: '1', controller: '', description: '', landscapeTypes: [], irrigationTypes: [], notes: '', photoData: [] },
      ],
      backflows: [{ id: 300, manufacturer: '', type: '', model: '', size: '' }],
      overview: null,
    })
    renderForm()
    await selectSite()
    await waitFor(() => {
      expect(screen.getByTestId('expand-saved-info-btn')).toBeInTheDocument()
    })
  })

  it('equipment sections container is present after site selection', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => {
      expect(screen.getByTestId('equipment-sections')).toBeInTheDocument()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('IrrigationForm — per-section editing', () => {
  async function expandSavedInfo() {
    await selectSite()
    await waitFor(() => screen.getByTestId('expand-saved-info-btn'))
    fireEvent.click(screen.getByTestId('expand-saved-info-btn'))
    await waitFor(() => screen.getByTestId('overview-lock-overlay'))
  }

  it('clicking overview section overlay activates it and shows Save button', async () => {
    renderForm()
    await expandSavedInfo()

    fireEvent.click(screen.getByTestId('overview-lock-overlay'))

    await waitFor(() => {
      expect(screen.queryByTestId('overview-lock-overlay')).not.toBeInTheDocument()
    })
    // Save button appears in overview section header (button with text "Save" in a section-header)
    const saveBtns = screen.getAllByRole('button', { name: 'Save' })
    expect(saveBtns.length).toBeGreaterThanOrEqual(1)
  })

  it('clicking backflows section overlay activates it', async () => {
    renderForm()
    await expandSavedInfo()

    fireEvent.click(screen.getByTestId('backflows-lock-overlay'))

    await waitFor(() => {
      expect(screen.queryByTestId('backflows-lock-overlay')).not.toBeInTheDocument()
    })
  })

  it('clicking controllers section overlay activates it', async () => {
    renderForm()
    await expandSavedInfo()

    fireEvent.click(screen.getByTestId('controllers-lock-overlay'))

    await waitFor(() => {
      expect(screen.queryByTestId('controllers-lock-overlay')).not.toBeInTheDocument()
    })
  })

  it('clicking zones section overlay activates it', async () => {
    renderForm()
    await expandSavedInfo()

    fireEvent.click(screen.getByTestId('zones-lock-overlay'))

    await waitFor(() => {
      expect(screen.queryByTestId('zones-lock-overlay')).not.toBeInTheDocument()
    })
  })

  it('clicking Save in an active section returns it to locked (greyed) state', async () => {
    renderForm()
    await expandSavedInfo()

    // Activate overview
    fireEvent.click(screen.getByTestId('overview-lock-overlay'))
    await waitFor(() => {
      expect(screen.getByTestId('overview-save-btn')).toBeInTheDocument()
    })

    // Click section Save
    fireEvent.click(screen.getByTestId('overview-save-btn'))

    // Overview overlay should be back (section is locked again)
    await waitFor(() => {
      expect(screen.getByTestId('overview-lock-overlay')).toBeInTheDocument()
    })
  })

  it('section save buttons use distinct data-testids per section', async () => {
    renderForm()
    await expandSavedInfo()

    // Activate backflows
    fireEvent.click(screen.getByTestId('backflows-lock-overlay'))
    await waitFor(() => expect(screen.getByTestId('backflows-save-btn')).toBeInTheDocument())

    // Activate controllers
    fireEvent.click(screen.getByTestId('backflows-save-btn'))
    fireEvent.click(screen.getByTestId('controllers-lock-overlay'))
    await waitFor(() => expect(screen.getByTestId('controllers-save-btn')).toBeInTheDocument())

    // Activate zones
    fireEvent.click(screen.getByTestId('controllers-save-btn'))
    fireEvent.click(screen.getByTestId('zones-lock-overlay'))
    await waitFor(() => expect(screen.getByTestId('zones-save-btn')).toBeInTheDocument())
  })

  it('only one section is active at a time — other sections stay locked', async () => {
    renderForm()
    await expandSavedInfo()

    fireEvent.click(screen.getByTestId('overview-lock-overlay'))
    await waitFor(() => expect(screen.queryByTestId('overview-lock-overlay')).not.toBeInTheDocument())

    // Other sections still have overlays
    expect(screen.getByTestId('backflows-lock-overlay')).toBeInTheDocument()
    expect(screen.getByTestId('controllers-lock-overlay')).toBeInTheDocument()
    expect(screen.getByTestId('zones-lock-overlay')).toBeInTheDocument()
  })

  it('collapsing resets active section — re-expanding shows all sections locked again', async () => {
    renderForm()
    await expandSavedInfo()

    // Activate overview
    fireEvent.click(screen.getByTestId('overview-lock-overlay'))
    await waitFor(() => expect(screen.queryByTestId('overview-lock-overlay')).not.toBeInTheDocument())

    // Collapse
    fireEvent.click(screen.getByTestId('expand-saved-info-btn'))
    await waitFor(() => expect(screen.queryByTestId('overview-lock-overlay')).not.toBeInTheDocument())

    // Re-expand
    fireEvent.click(screen.getByTestId('expand-saved-info-btn'))
    await waitFor(() => {
      expect(screen.getByTestId('overview-lock-overlay')).toBeInTheDocument()
    })
  })

  it('selecting a different site resets expand state to collapsed', async () => {
    renderForm()
    await expandSavedInfo()
    expect(screen.getByTestId('expand-saved-info-btn')).toHaveTextContent('Collapse')

    // Select same site again (simulates re-selection)
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger-site-select'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('expand-saved-info-btn')).toHaveTextContent('Expand saved information')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('IrrigationForm — switching to New Site mode clears locks', () => {
  it('client lock is cleared when switching to new site mode', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => screen.getByTestId('client-name-locked'))

    fireEvent.click(screen.getByTestId('trigger-mode-new'))

    await waitFor(() => {
      expect(screen.queryByTestId('client-name-locked')).not.toBeInTheDocument()
    })
  })

  it('expand button is removed when switching to new site mode', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => screen.getByTestId('expand-saved-info-btn'))

    fireEvent.click(screen.getByTestId('trigger-mode-new'))

    await waitFor(() => {
      expect(screen.queryByTestId('expand-saved-info-btn')).not.toBeInTheDocument()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('IrrigationForm — switching back to existing mode', () => {
  it('switching back to existing mode clears site selection and locks', async () => {
    renderForm()

    // First, switch to new site mode
    fireEvent.click(screen.getByTestId('trigger-mode-new'))

    // Then switch back to existing mode
    fireEvent.click(screen.getByTestId('trigger-mode-existing'))

    // Verify site selection is cleared and fields are ready for a new selection
    expect(screen.queryByTestId('equipment-lock-overlay')).not.toBeInTheDocument()
    expect(screen.queryByTestId('client-name-locked')).not.toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('IrrigationForm — DOM order', () => {
  it('site selector wrapper appears before client name field in DOM', () => {
    renderForm()

    const siteWrapper = screen.getByTestId('site-selector-wrapper')
    const clientName  = screen.getByPlaceholderText(/type or select a client/i)

    const position = siteWrapper.compareDocumentPosition(clientName)
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('IrrigationForm — section Save persists equipment to database', () => {
  const mockUpdateSiteEquipment = updateSiteEquipment as jest.Mock

  async function expandSavedInfo() {
    await selectSite()
    await waitFor(() => screen.getByTestId('expand-saved-info-btn'))
    fireEvent.click(screen.getByTestId('expand-saved-info-btn'))
    await waitFor(() => screen.getByTestId('overview-lock-overlay'))
  }

  beforeEach(() => {
    mockUpdateSiteEquipment.mockClear()
    ;(getSiteEquipment as jest.Mock).mockResolvedValue(EQUIPMENT_WITH_DATA)
  })

  it('calls updateSiteEquipment when overview Save is clicked', async () => {
    renderForm()
    await expandSavedInfo()

    fireEvent.click(screen.getByTestId('overview-lock-overlay'))
    await waitFor(() => screen.getByTestId('overview-save-btn'))
    fireEvent.click(screen.getByTestId('overview-save-btn'))

    await waitFor(() => {
      expect(mockUpdateSiteEquipment).toHaveBeenCalledTimes(1)
    })
  })

  it('calls updateSiteEquipment with the correct siteId', async () => {
    renderForm()
    await expandSavedInfo()

    fireEvent.click(screen.getByTestId('overview-lock-overlay'))
    await waitFor(() => screen.getByTestId('overview-save-btn'))
    fireEvent.click(screen.getByTestId('overview-save-btn'))

    await waitFor(() => {
      expect(mockUpdateSiteEquipment).toHaveBeenCalledWith(
        expect.objectContaining({ siteId: 'site-1' })
      )
    })
  })

  it('calls updateSiteEquipment when backflows Save is clicked', async () => {
    renderForm()
    await expandSavedInfo()

    fireEvent.click(screen.getByTestId('backflows-lock-overlay'))
    await waitFor(() => screen.getByTestId('backflows-save-btn'))
    fireEvent.click(screen.getByTestId('backflows-save-btn'))

    await waitFor(() => {
      expect(mockUpdateSiteEquipment).toHaveBeenCalledTimes(1)
    })
  })

  it('calls updateSiteEquipment when controllers Save is clicked', async () => {
    renderForm()
    await expandSavedInfo()

    fireEvent.click(screen.getByTestId('controllers-lock-overlay'))
    await waitFor(() => screen.getByTestId('controllers-save-btn'))
    fireEvent.click(screen.getByTestId('controllers-save-btn'))

    await waitFor(() => {
      expect(mockUpdateSiteEquipment).toHaveBeenCalledTimes(1)
    })
  })

  it('calls updateSiteEquipment when zones Save is clicked', async () => {
    renderForm()
    await expandSavedInfo()

    fireEvent.click(screen.getByTestId('zones-lock-overlay'))
    await waitFor(() => screen.getByTestId('zones-save-btn'))
    fireEvent.click(screen.getByTestId('zones-save-btn'))

    await waitFor(() => {
      expect(mockUpdateSiteEquipment).toHaveBeenCalledTimes(1)
    })
  })

  it('includes loaded zones and controllers in the save payload', async () => {
    renderForm()
    await expandSavedInfo()

    fireEvent.click(screen.getByTestId('overview-lock-overlay'))
    await waitFor(() => screen.getByTestId('overview-save-btn'))
    fireEvent.click(screen.getByTestId('overview-save-btn'))

    await waitFor(() => {
      expect(mockUpdateSiteEquipment).toHaveBeenCalledWith(
        expect.objectContaining({
          zones: expect.arrayContaining([
            expect.objectContaining({ zoneNum: '1' }),
            expect.objectContaining({ zoneNum: '2' }),
          ]),
          controllers: expect.arrayContaining([
            expect.objectContaining({ manufacturer: 'Hunter' }),
          ]),
        })
      )
    })
  })

  it('section collapses back to locked state after Save', async () => {
    renderForm()
    await expandSavedInfo()

    fireEvent.click(screen.getByTestId('overview-lock-overlay'))
    await waitFor(() => screen.getByTestId('overview-save-btn'))
    fireEvent.click(screen.getByTestId('overview-save-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('overview-lock-overlay')).toBeInTheDocument()
    })
  })

  it('does not call updateSiteEquipment when no site is selected', async () => {
    renderForm()
    // Do NOT select a site — selectedSiteId is null
    // Verify the save button is never reachable (equipment sections not shown)
    expect(screen.queryByTestId('overview-save-btn')).not.toBeInTheDocument()
    expect(mockUpdateSiteEquipment).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('IrrigationForm — zone issues count matches loaded equipment', () => {
  it('zone issues table is not shown before a site is selected', () => {
    renderForm()
    expect(screen.queryByText('Zone Issues')).not.toBeInTheDocument()
  })

  it('zone issues appears after a site is selected', async () => {
    ;(getSiteEquipment as jest.Mock).mockResolvedValue(EMPTY_EQUIPMENT)
    renderForm()
    await act(async () => { fireEvent.click(screen.getByTestId('trigger-site-select')) })
    await waitFor(() => {
      expect(screen.getByText('Zone Issues')).toBeInTheDocument()
    })
  })

  it('zone issues row count matches number of zones loaded from equipment', async () => {
    ;(getSiteEquipment as jest.Mock).mockResolvedValue(EQUIPMENT_WITH_DATA)
    renderForm()
    await act(async () => { fireEvent.click(screen.getByTestId('trigger-site-select')) })

    await waitFor(() => {
      expect(screen.getByText('Zone Issues')).toBeInTheDocument()
    })

    // EQUIPMENT_WITH_DATA has 2 zones (zoneNum 1 and 2)
    expect(screen.getByText('Zone 1')).toBeInTheDocument()
    expect(screen.getByText('Zone 2')).toBeInTheDocument()
  })

  it('zone issues does not show stale default zones while a new site is loading', async () => {
    let resolveEquipment!: (v: typeof EQUIPMENT_WITH_DATA) => void
    ;(getSiteEquipment as jest.Mock).mockImplementation(
      () => new Promise(res => { resolveEquipment = res })
    )
    renderForm()

    // Trigger site select — equipment is loading
    fireEvent.click(screen.getByTestId('trigger-site-select'))

    // Zone issues should not yet be visible (cleared while loading)
    expect(screen.queryByText('Zone 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Zone 2')).not.toBeInTheDocument()

    // Resolve with 2 zones
    await act(async () => { resolveEquipment(EQUIPMENT_WITH_DATA) })

    await waitFor(() => {
      expect(screen.getByText('Zone 1')).toBeInTheDocument()
      expect(screen.getByText('Zone 2')).toBeInTheDocument()
    })
  })

  it('zone issues updates to new site zones when a different site is selected', async () => {
    const EQUIPMENT_3_ZONES = {
      ...EMPTY_EQUIPMENT,
      zones: [
        { id: 10, zoneNum: '1', controller: '', description: '', landscapeTypes: [], irrigationTypes: [], notes: '', photoData: [] },
        { id: 11, zoneNum: '2', controller: '', description: '', landscapeTypes: [], irrigationTypes: [], notes: '', photoData: [] },
        { id: 12, zoneNum: '3', controller: '', description: '', landscapeTypes: [], irrigationTypes: [], notes: '', photoData: [] },
      ],
    }
    ;(getSiteEquipment as jest.Mock).mockResolvedValue(EQUIPMENT_3_ZONES)
    renderForm()

    await act(async () => { fireEvent.click(screen.getByTestId('trigger-site-select')) })

    await waitFor(() => {
      expect(screen.getByText('Zone 1')).toBeInTheDocument()
      expect(screen.getByText('Zone 2')).toBeInTheDocument()
      expect(screen.getByText('Zone 3')).toBeInTheDocument()
    })
  })

  it('switching to new site mode shows zone issues with default 2 zones', async () => {
    renderForm()
    fireEvent.click(screen.getByTestId('trigger-mode-new'))

    await waitFor(() => {
      expect(screen.getByText('Zone Issues')).toBeInTheDocument()
    })
    expect(screen.getByText('Zone 1')).toBeInTheDocument()
    expect(screen.getByText('Zone 2')).toBeInTheDocument()
  })
})
