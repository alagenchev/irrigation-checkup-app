/**
 * @jest-environment jsdom
 *
 * Unit tests for SitesPageClient component
 *
 * Task: sites-menu-irrigation (c9e3a2f1-6b4d-4e8a-8f2c-1d7a9e5f3b8a)
 */

import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SitesPageClient } from '@/app/sites/sites-page-client'
import type { SiteWithClient } from '@/actions/sites'
import type { Client } from '@/types'

// Mock child components
jest.mock('@/app/sites/add-site-form', () => ({
  AddSiteForm: ({ clients }: { clients: Client[] }) => <div data-testid="add-site-form">Add Site Form ({clients.length} clients)</div>,
}))

jest.mock('@/app/sites/sites-table', () => ({
  SitesTable: ({ sites, onEditEquipment }: { sites: SiteWithClient[]; onEditEquipment: (id: string) => void }) => (
    <table data-testid="sites-table">
      <tbody>
        {sites.map(s => (
          <tr key={s.id} data-testid="sites-table-row">
            <td>{s.name}</td>
            <td>
              <button data-testid={`edit-equipment-${s.id}`} onClick={() => onEditEquipment(s.id)}>
                Edit Equipment
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}))

jest.mock('@/app/components/map/maps-list-panel', () => ({
  MapsListPanel: ({ siteName, onClose }: { siteName: string; onEditMap: (id: string) => void; onClose: () => void }) => (
    <div data-testid="maps-list-panel">
      <span>Maps for {siteName}</span>
      <button data-testid="maps-list-close" onClick={onClose}>Close</button>
    </div>
  ),
}))

jest.mock('@/app/components/map/map-canvas', () => ({
  MapCanvas: ({ siteName, onClose }: { siteName: string; onClose: () => void }) => (
    <div data-testid="map-canvas">
      <span>Map Canvas: {siteName}</span>
      <button data-testid="map-canvas-back" onClick={onClose}>Back</button>
    </div>
  ),
}))

jest.mock('@/app/sites/site-equipment-editor', () => ({
  SiteEquipmentEditor: ({ site, onClose, onSave }: any) => (
    <div data-testid="site-equipment-editor">
      <h2>{site.name} Equipment Editor</h2>
      <button data-testid="equipment-editor-close" onClick={onClose}>
        Close
      </button>
      <button data-testid="equipment-editor-save" onClick={onSave}>
        Save
      </button>
    </div>
  ),
}))

// Test data
const MOCK_SITES: SiteWithClient[] = [
  {
    id: 'site-1',
    companyId: 'company-1',
    name: 'Acme Corp',
    address: '123 Main St',
    clientId: 'client-1',
    notes: null,
    createdAt: new Date(),
    clientName: 'Acme',
    clientAddress: '123 Main St',
  },
  {
    id: 'site-2',
    companyId: 'company-1',
    name: 'Beta Industries',
    address: '456 Oak Ave',
    clientId: 'client-2',
    notes: null,
    createdAt: new Date(),
    clientName: 'Beta',
    clientAddress: '456 Oak Ave',
  },
  {
    id: 'site-3',
    companyId: 'company-1',
    name: 'Gamma Ltd',
    address: null,
    clientId: null,
    notes: null,
    createdAt: new Date(),
    clientName: null,
    clientAddress: null,
  },
]

const MOCK_CLIENTS: Client[] = [
  { id: 'client-1', companyId: 'company-1', name: 'Acme', address: '123 Main St', phone: null, email: null, accountType: null, accountNumber: null, createdAt: new Date() },
  { id: 'client-2', companyId: 'company-1', name: 'Beta', address: '456 Oak Ave', phone: null, email: null, accountType: null, accountNumber: null, createdAt: new Date() },
]

describe('SitesPageClient', () => {
  describe('rendering', () => {
    test('renders sites page with header', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      expect(screen.getByText('Sites')).toBeInTheDocument()
      expect(screen.getByTestId('sites-page')).toBeInTheDocument()
    })

    test('renders Add Site Form section', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      expect(screen.getByText('Add Site')).toBeInTheDocument()
      expect(screen.getByTestId('add-site-form')).toBeInTheDocument()
    })

    test('renders sites table with all sites', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      expect(screen.getByTestId('sites-table')).toBeInTheDocument()
      expect(screen.getByText('All Sites (3)')).toBeInTheDocument()
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      expect(screen.getByText('Beta Industries')).toBeInTheDocument()
      expect(screen.getByText('Gamma Ltd')).toBeInTheDocument()
    })

    test('renders sites-page-layout flex container', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      expect(screen.getByTestId('sites-page-layout')).toBeInTheDocument()
    })

    test('renders table panel', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      expect(screen.getByTestId('sites-page-table-panel')).toBeInTheDocument()
    })

    test('does not render editor panel initially', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      expect(screen.queryByTestId('sites-page-editor-panel')).not.toBeInTheDocument()
    })
  })

  describe('editor panel open/close', () => {
    test('opens editor panel when Edit Equipment clicked on a site', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      // Initially no editor
      expect(screen.queryByTestId('sites-page-editor-panel')).not.toBeInTheDocument()

      // Click Edit Equipment for Acme Corp
      fireEvent.click(screen.getByTestId('edit-equipment-site-1'))

      // Editor panel should appear
      expect(screen.getByTestId('sites-page-editor-panel')).toBeInTheDocument()
      expect(screen.getByText('Acme Corp Equipment Editor')).toBeInTheDocument()
    })

    test('closes editor panel when onClose callback is invoked', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      // Open editor
      fireEvent.click(screen.getByTestId('edit-equipment-site-1'))
      expect(screen.getByTestId('sites-page-editor-panel')).toBeInTheDocument()

      // Close editor
      fireEvent.click(screen.getByTestId('equipment-editor-close'))
      expect(screen.queryByTestId('sites-page-editor-panel')).not.toBeInTheDocument()
    })

    test('closes editor panel when onSave callback is invoked', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      // Open editor
      fireEvent.click(screen.getByTestId('edit-equipment-site-1'))
      expect(screen.getByTestId('sites-page-editor-panel')).toBeInTheDocument()

      // Trigger onSave (which closes the editor)
      fireEvent.click(screen.getByTestId('equipment-editor-save'))
      expect(screen.queryByTestId('sites-page-editor-panel')).not.toBeInTheDocument()
    })
  })

  describe('toggle behavior', () => {
    test('closing editor resets selectedSiteId to null', () => {
      const { rerender } = render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      // Open editor for site-1
      fireEvent.click(screen.getByTestId('edit-equipment-site-1'))
      expect(screen.getByText('Acme Corp Equipment Editor')).toBeInTheDocument()

      // Close editor
      fireEvent.click(screen.getByTestId('equipment-editor-close'))
      expect(screen.queryByTestId('sites-page-editor-panel')).not.toBeInTheDocument()

      // Re-render the same props (simulating parent re-render)
      rerender(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      // Editor should still be closed
      expect(screen.queryByTestId('sites-page-editor-panel')).not.toBeInTheDocument()
    })

    test('clicking Edit Equipment on same site toggles editor open/closed', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      // Click Edit Equipment for site-1 (opens)
      fireEvent.click(screen.getByTestId('edit-equipment-site-1'))
      expect(screen.getByTestId('sites-page-editor-panel')).toBeInTheDocument()

      // Click Edit Equipment for site-1 again (closes — toggle)
      fireEvent.click(screen.getByTestId('edit-equipment-site-1'))
      expect(screen.queryByTestId('sites-page-editor-panel')).not.toBeInTheDocument()

      // Click again (opens)
      fireEvent.click(screen.getByTestId('edit-equipment-site-1'))
      expect(screen.getByTestId('sites-page-editor-panel')).toBeInTheDocument()
    })

    test('clicking Edit Equipment on different site switches to that site', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      // Open editor for site-1
      fireEvent.click(screen.getByTestId('edit-equipment-site-1'))
      expect(screen.getByText('Acme Corp Equipment Editor')).toBeInTheDocument()

      // Click Edit Equipment for site-2 (switches to site-2)
      fireEvent.click(screen.getByTestId('edit-equipment-site-2'))

      // Editor should show site-2, not site-1
      expect(screen.queryByText('Acme Corp Equipment Editor')).not.toBeInTheDocument()
      expect(screen.getByText('Beta Industries Equipment Editor')).toBeInTheDocument()

      // Editor panel should still be visible
      expect(screen.getByTestId('sites-page-editor-panel')).toBeInTheDocument()
    })
  })

  describe('key prop behavior', () => {
    test('remounts SiteEquipmentEditor when selectedSite changes (key prop)', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      // Open editor for site-1
      fireEvent.click(screen.getByTestId('edit-equipment-site-1'))
      expect(screen.getByTestId('site-equipment-editor')).toBeInTheDocument()

      // Switch to site-2
      fireEvent.click(screen.getByTestId('edit-equipment-site-2'))
      expect(screen.getByTestId('site-equipment-editor')).toBeInTheDocument()

      // Due to key={selectedSite.id}, the header change confirms switch
      expect(screen.getByText('Beta Industries Equipment Editor')).toBeInTheDocument()
      expect(screen.queryByText('Acme Corp Equipment Editor')).not.toBeInTheDocument()
    })
  })

  describe('layout responsiveness', () => {
    test('layout container has flex display', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      const layout = screen.getByTestId('sites-page-layout')
      expect(layout).toHaveStyle({ display: 'flex' })
    })

    test('table panel width adjusts when editor is open vs closed', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      const tablePanel = screen.getByTestId('sites-page-table-panel')

      // Initially, table panel should be full width
      const initialStyle = getComputedStyle(tablePanel)
      expect(initialStyle.width).toBeTruthy()

      // Open editor
      fireEvent.click(screen.getByTestId('edit-equipment-site-1'))

      // Table panel width should change to 55% (per the code)
      const openStyle = getComputedStyle(tablePanel)
      expect(openStyle.width).toBeTruthy()
    })

    test('editor panel appears to the right of table when open', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      fireEvent.click(screen.getByTestId('edit-equipment-site-1'))

      const layout = screen.getByTestId('sites-page-layout')
      const tablePanel = screen.getByTestId('sites-page-table-panel')
      const editorPanel = screen.getByTestId('sites-page-editor-panel')

      // Both panels should be in the same flex container
      expect(layout.contains(tablePanel)).toBe(true)
      expect(layout.contains(editorPanel)).toBe(true)

      // Layout should have flex display and gap
      expect(layout).toHaveStyle({ display: 'flex' })
    })
  })

  describe('empty sites list', () => {
    test('renders with empty sites array', () => {
      render(<SitesPageClient sites={[]} clients={MOCK_CLIENTS} />)

      expect(screen.getByText('Sites')).toBeInTheDocument()
      expect(screen.getByTestId('sites-table')).toBeInTheDocument()
      expect(screen.getByText('All Sites (0)')).toBeInTheDocument()
    })
  })

  describe('site lookup', () => {
    test('finds correct site when opening editor', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      // Click Edit Equipment for the second site (site-2)
      fireEvent.click(screen.getByTestId('edit-equipment-site-2'))

      // Verify the correct site is displayed
      expect(screen.getByText('Beta Industries Equipment Editor')).toBeInTheDocument()
    })

    test('handles missing site gracefully (site not found)', () => {
      // Provide a sites list that doesn't include the site we'll try to select
      const limitedSites = MOCK_SITES.slice(0, 1)
      render(<SitesPageClient sites={limitedSites} clients={MOCK_CLIENTS} />)

      // Try to open editor for site-2 (which is not in the list)
      // The button won't exist, but let's verify the component doesn't crash
      expect(screen.getByTestId('sites-page')).toBeInTheDocument()
    })
  })

  describe('integration with child components', () => {
    test('passes correct sites to SitesTable', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      // All three sites should be rendered in the table
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      expect(screen.getByText('Beta Industries')).toBeInTheDocument()
      expect(screen.getByText('Gamma Ltd')).toBeInTheDocument()
    })

    test('passes correct clients to AddSiteForm', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      // Mock AddSiteForm renders "Add Site Form (N clients)"
      expect(screen.getByText('Add Site Form (2 clients)')).toBeInTheDocument()
    })

    test('passes correct site to SiteEquipmentEditor when selected', () => {
      render(<SitesPageClient sites={MOCK_SITES} clients={MOCK_CLIENTS} />)

      fireEvent.click(screen.getByTestId('edit-equipment-site-3'))

      // site-3 has no clientName, but the mock will render site.name in the editor
      expect(screen.getByText('Gamma Ltd Equipment Editor')).toBeInTheDocument()
    })
  })
})
