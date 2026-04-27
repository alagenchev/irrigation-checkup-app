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
import { getSiteEquipment } from '@/actions/sites'
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
  it('equipment lock overlay is NOT present initially', () => {
    renderForm()
    expect(screen.queryByTestId('equipment-lock-overlay')).not.toBeInTheDocument()
  })

  it('equipment lock overlay appears after site selection completes', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => {
      expect(screen.getByTestId('equipment-lock-overlay')).toBeInTheDocument()
    })
  })

  it('clicking the equipment lock overlay removes it', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => screen.getByTestId('equipment-lock-overlay'))

    fireEvent.click(screen.getByTestId('equipment-lock-overlay'))

    await waitFor(() => {
      expect(screen.queryByTestId('equipment-lock-overlay')).not.toBeInTheDocument()
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

  it('equipment lock is cleared when switching to new site mode', async () => {
    renderForm()
    await selectSite()
    await waitFor(() => screen.getByTestId('equipment-lock-overlay'))

    fireEvent.click(screen.getByTestId('trigger-mode-new'))

    await waitFor(() => {
      expect(screen.queryByTestId('equipment-lock-overlay')).not.toBeInTheDocument()
    })
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
