/**
 * @jest-environment jsdom
 *
 * Unit tests for SitesTable component
 *
 * Task: sites-menu-irrigation (c9e3a2f1-6b4d-4e8a-8f2c-1d7a9e5f3b8a)
 */

import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SitesTable } from '@/app/sites/sites-table'
import type { SiteWithClient } from '@/actions/sites'

const MOCK_SITES: SiteWithClient[] = [
  {
    id: 'site-1',
    companyId: 'company-1',
    name: 'Acme Corp',
    address: '123 Main St',
    clientId: 'client-1',
    notes: 'Important site',
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

describe('SitesTable', () => {
  describe('rendering', () => {
    test('renders table with header row', () => {
      const onEditEquipment = jest.fn()
      render(<SitesTable sites={MOCK_SITES} onEditEquipment={onEditEquipment} />)

      expect(screen.getByTestId('sites-table')).toBeInTheDocument()
      expect(screen.getByText('Site Name')).toBeInTheDocument()
      expect(screen.getByText('Address')).toBeInTheDocument()
      expect(screen.getByText('Client')).toBeInTheDocument()
      expect(screen.getByText('Notes')).toBeInTheDocument()
    })

    test('renders all sites as table rows', () => {
      const onEditEquipment = jest.fn()
      render(<SitesTable sites={MOCK_SITES} onEditEquipment={onEditEquipment} />)

      const rows = screen.getAllByTestId('sites-table-row')
      expect(rows).toHaveLength(3)
    })

    test('displays site name in bold', () => {
      const onEditEquipment = jest.fn()
      render(<SitesTable sites={MOCK_SITES} onEditEquipment={onEditEquipment} />)

      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      expect(screen.getByText('Acme Corp')).toHaveStyle({ fontWeight: '600' })
    })

    test('displays site address', () => {
      const onEditEquipment = jest.fn()
      render(<SitesTable sites={MOCK_SITES} onEditEquipment={onEditEquipment} />)

      expect(screen.getByText('123 Main St')).toBeInTheDocument()
      expect(screen.getByText('456 Oak Ave')).toBeInTheDocument()
    })

    test('displays dash for missing address', () => {
      const onEditEquipment = jest.fn()
      render(<SitesTable sites={MOCK_SITES} onEditEquipment={onEditEquipment} />)

      // Gamma Ltd has no address, should display "—"
      const cells = screen.getAllByText('—')
      expect(cells.length).toBeGreaterThan(0)
    })

    test('displays client name', () => {
      const onEditEquipment = jest.fn()
      render(<SitesTable sites={MOCK_SITES} onEditEquipment={onEditEquipment} />)

      expect(screen.getByText('Acme')).toBeInTheDocument()
      expect(screen.getByText('Beta')).toBeInTheDocument()
    })

    test('displays dash for missing client', () => {
      const onEditEquipment = jest.fn()
      render(<SitesTable sites={MOCK_SITES} onEditEquipment={onEditEquipment} />)

      // Gamma Ltd has no client
      const cells = screen.getAllByText('—')
      expect(cells.length).toBeGreaterThan(0)
    })

    test('displays site notes', () => {
      const onEditEquipment = jest.fn()
      render(<SitesTable sites={MOCK_SITES} onEditEquipment={onEditEquipment} />)

      expect(screen.getByText('Important site')).toBeInTheDocument()
    })

    test('displays dash for missing notes', () => {
      const onEditEquipment = jest.fn()
      render(<SitesTable sites={MOCK_SITES} onEditEquipment={onEditEquipment} />)

      // Beta Industries and Gamma Ltd have null notes
      const cells = screen.getAllByText('—')
      expect(cells.length).toBeGreaterThan(0)
    })

    test('renders Edit Equipment button for each site', () => {
      const onEditEquipment = jest.fn()
      render(<SitesTable sites={MOCK_SITES} onEditEquipment={onEditEquipment} />)

      const editButtons = screen.getAllByTestId('sites-table-edit-equipment')
      expect(editButtons).toHaveLength(3)
      editButtons.forEach(btn => {
        expect(btn).toHaveTextContent('Edit Equipment')
      })
    })
  })

  describe('empty sites list', () => {
    test('renders empty message when no sites provided', () => {
      const onEditEquipment = jest.fn()
      render(<SitesTable sites={[]} onEditEquipment={onEditEquipment} />)

      expect(screen.getByText('No sites yet. Add one above.')).toBeInTheDocument()
      expect(screen.queryByTestId('sites-table')).not.toBeInTheDocument()
    })
  })

  describe('Edit Equipment button interaction', () => {
    test('calls onEditEquipment with correct site ID when Edit Equipment clicked', () => {
      const onEditEquipment = jest.fn()
      render(<SitesTable sites={MOCK_SITES} onEditEquipment={onEditEquipment} />)

      const editButtons = screen.getAllByTestId('sites-table-edit-equipment')

      // Click Edit Equipment for first site
      fireEvent.click(editButtons[0])
      expect(onEditEquipment).toHaveBeenCalledWith('site-1')

      // Click Edit Equipment for second site
      fireEvent.click(editButtons[1])
      expect(onEditEquipment).toHaveBeenCalledWith('site-2')

      // Click Edit Equipment for third site
      fireEvent.click(editButtons[2])
      expect(onEditEquipment).toHaveBeenCalledWith('site-3')

      expect(onEditEquipment).toHaveBeenCalledTimes(3)
    })

    test('Edit Equipment button is clickable', () => {
      const onEditEquipment = jest.fn()
      render(<SitesTable sites={MOCK_SITES} onEditEquipment={onEditEquipment} />)

      const editButton = screen.getAllByTestId('sites-table-edit-equipment')[0]
      expect(editButton).not.toBeDisabled()

      fireEvent.click(editButton)
      expect(onEditEquipment).toHaveBeenCalled()
    })
  })

  describe('multiple sites handling', () => {
    test('handles multiple sites correctly', () => {
      const onEditEquipment = jest.fn()
      const manySites: SiteWithClient[] = Array.from({ length: 10 }, (_, i) => ({
        id: `site-${i}`,
        companyId: 'company-1',
        name: `Site ${i}`,
        address: `${100 + i} Street`,
        clientId: `client-${i}`,
        notes: null,
        createdAt: new Date(),
        clientName: `Client ${i}`,
        clientAddress: `${100 + i} Street`,
      }))

      render(<SitesTable sites={manySites} onEditEquipment={onEditEquipment} />)

      const rows = screen.getAllByTestId('sites-table-row')
      expect(rows).toHaveLength(10)

      expect(screen.getByText('Site 0')).toBeInTheDocument()
      expect(screen.getByText('Site 9')).toBeInTheDocument()
    })
  })

  describe('site data display variations', () => {
    test('handles site with all fields populated', () => {
      const onEditEquipment = jest.fn()
      const completeSite: SiteWithClient = {
        id: 'site-complete',
        companyId: 'company-1',
        name: 'Complete Site',
        address: '789 Elm St, Springfield, IL 62701',
        clientId: 'client-complete',
        notes: 'Full equipment set installed',
        createdAt: new Date(),
        clientName: 'Complete Client',
        clientAddress: '789 Elm St, Springfield, IL 62701',
      }

      render(<SitesTable sites={[completeSite]} onEditEquipment={onEditEquipment} />)

      expect(screen.getByText('Complete Site')).toBeInTheDocument()
      expect(screen.getByText('789 Elm St, Springfield, IL 62701')).toBeInTheDocument()
      expect(screen.getByText('Complete Client')).toBeInTheDocument()
      expect(screen.getByText('Full equipment set installed')).toBeInTheDocument()
    })

    test('handles site with minimal fields', () => {
      const onEditEquipment = jest.fn()
      const minimalSite: SiteWithClient = {
        id: 'site-minimal',
        companyId: 'company-1',
        name: 'Minimal Site',
        address: null,
        clientId: null,
        notes: null,
        createdAt: new Date(),
        clientName: null,
        clientAddress: null,
      }

      render(<SitesTable sites={[minimalSite]} onEditEquipment={onEditEquipment} />)

      expect(screen.getByText('Minimal Site')).toBeInTheDocument()
      const cells = screen.getAllByText('—')
      expect(cells.length).toBeGreaterThan(0)
    })

    test('handles site with long notes', () => {
      const onEditEquipment = jest.fn()
      const longNotes = 'A'.repeat(200)
      const siteWithLongNotes: SiteWithClient = {
        id: 'site-long-notes',
        companyId: 'company-1',
        name: 'Long Notes Site',
        address: '100 Test St',
        clientId: 'client-1',
        notes: longNotes,
        createdAt: new Date(),
        clientName: 'Test Client',
        clientAddress: '100 Test St',
      }

      render(<SitesTable sites={[siteWithLongNotes]} onEditEquipment={onEditEquipment} />)

      expect(screen.getByText(longNotes)).toBeInTheDocument()
    })
  })

  describe('callback behavior', () => {
    test('onEditEquipment callback is invoked for each button click', () => {
      const onEditEquipment = jest.fn()
      render(<SitesTable sites={MOCK_SITES} onEditEquipment={onEditEquipment} />)

      const editButtons = screen.getAllByTestId('sites-table-edit-equipment')

      fireEvent.click(editButtons[0])
      fireEvent.click(editButtons[0])
      fireEvent.click(editButtons[1])

      expect(onEditEquipment).toHaveBeenCalledTimes(3)
      expect(onEditEquipment).toHaveBeenNthCalledWith(1, 'site-1')
      expect(onEditEquipment).toHaveBeenNthCalledWith(2, 'site-1')
      expect(onEditEquipment).toHaveBeenNthCalledWith(3, 'site-2')
    })
  })
})
