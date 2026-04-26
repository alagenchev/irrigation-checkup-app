/**
 * @jest-environment jsdom
 *
 * Unit tests for SiteEquipmentEditor component
 *
 * Task: sites-menu-irrigation (c9e3a2f1-6b4d-4e8a-8f2c-1d7a9e5f3b8a)
 */

import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SiteEquipmentEditor } from '@/app/sites/site-equipment-editor'
import type { SiteWithClient } from '@/actions/sites'

// Mock the server action
jest.mock('@/actions/sites', () => ({
  updateSiteEquipment: jest.fn(),
}))

import { updateSiteEquipment } from '@/actions/sites'
const mockUpdateSiteEquipment = updateSiteEquipment as jest.Mock

// Mock data
const MOCK_SITE: SiteWithClient = {
  id: 'site-1',
  companyId: 'company-1',
  name: 'Acme Corp Headquarters',
  address: '123 Main St, Springfield, IL 62701',
  clientId: 'client-1',
  notes: 'VIP account',
  createdAt: new Date(),
  clientName: 'Acme Corp',
  clientAddress: '123 Main St, Springfield, IL 62701',
}

describe('SiteEquipmentEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateSiteEquipment.mockResolvedValue({ ok: true })
  })

  describe('rendering', () => {
    test('renders site header with name, address, and client', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      expect(screen.getByText('Acme Corp Headquarters')).toBeInTheDocument()
      expect(screen.getByText('123 Main St, Springfield, IL 62701')).toBeInTheDocument()
      expect(screen.getByText('Client: Acme Corp')).toBeInTheDocument()
    })

    test('renders System Overview section with all fields', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      expect(screen.getByTestId('site-equipment-editor-overview')).toBeInTheDocument()
      expect(screen.getByTestId('site-equipment-editor-overview-static-pressure')).toBeInTheDocument()
      expect(screen.getByTestId('site-equipment-editor-overview-backflow-installed')).toBeInTheDocument()
      expect(screen.getByTestId('site-equipment-editor-overview-backflow-serviceable')).toBeInTheDocument()
      expect(screen.getByTestId('site-equipment-editor-overview-isolation-valve')).toBeInTheDocument()
      expect(screen.getByTestId('site-equipment-editor-overview-system-notes')).toBeInTheDocument()
    })

    test('renders empty backflows section initially', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      expect(screen.getByText('No backflow devices. Add one above.')).toBeInTheDocument()
    })

    test('renders empty controllers section initially', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      expect(screen.getByText('No controllers. Add one above.')).toBeInTheDocument()
    })

    test('renders empty zones section initially', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      expect(screen.getAllByText('No zones. Add one above.')).toHaveLength(1)
    })

    test('renders Save and Cancel buttons', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      expect(screen.getByTestId('site-equipment-editor-save')).toBeInTheDocument()
      expect(screen.getByTestId('site-equipment-editor-cancel')).toBeInTheDocument()
    })

    test('renders add buttons for controllers, zones, backflows', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      expect(screen.getByTestId('site-equipment-editor-add-controller')).toBeInTheDocument()
      expect(screen.getByTestId('site-equipment-editor-add-zone')).toBeInTheDocument()
      expect(screen.getByTestId('site-equipment-editor-add-backflow')).toBeInTheDocument()
    })
  })

  describe('controllers', () => {
    test('adds a controller when + Controller clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      await user.click(screen.getByTestId('site-equipment-editor-add-controller'))

      expect(screen.getByTestId('site-equipment-editor-controllers-table')).toBeInTheDocument()
      expect(screen.getByTestId('site-equipment-editor-controller-row')).toBeInTheDocument()
    })

    test('removes a controller when ✕ clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add controller
      await user.click(screen.getByTestId('site-equipment-editor-add-controller'))
      expect(screen.getByTestId('site-equipment-editor-controller-row')).toBeInTheDocument()

      // Remove it
      const removeBtn = screen.getByTestId('site-equipment-editor-remove-controller')
      await user.click(removeBtn)

      expect(screen.queryByTestId('site-equipment-editor-controller-row')).not.toBeInTheDocument()
    })

    test('allows editing controller fields', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add controller
      await user.click(screen.getByTestId('site-equipment-editor-add-controller'))

      // Find input fields within the controller row
      const inputs = screen.getAllByPlaceholderText('Hunter')
      expect(inputs.length).toBeGreaterThan(0)

      // Type into manufacturer field
      await user.type(inputs[0], 'Hunter Pro-HC')
      expect(inputs[0]).toHaveValue('Hunter Pro-HC')
    })

    test('toggles master valve checkbox and reveals master valve notes textarea', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add controller
      await user.click(screen.getByTestId('site-equipment-editor-add-controller'))

      // Find master valve checkbox
      const checkboxes = screen.getAllByRole('checkbox')
      const masterValveCheckbox = checkboxes.find(cb => cb.getAttribute('type') === 'checkbox' && !cb.closest('label')?.textContent?.includes('landscape') && !cb.closest('label')?.textContent?.includes('irrigation'))

      // Initially master valve notes should not be visible
      expect(screen.queryByPlaceholderText('Repair notes...')).not.toBeInTheDocument()

      // Check master valve
      if (masterValveCheckbox) {
        await user.click(masterValveCheckbox)
        // Now master valve notes should appear
        expect(screen.getByPlaceholderText('Repair notes...')).toBeInTheDocument()
      }
    })
  })

  describe('zones', () => {
    test('adds a zone when + Zone clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      await user.click(screen.getByTestId('site-equipment-editor-add-zone'))

      expect(screen.getByTestId('site-equipment-editor-zones-table')).toBeInTheDocument()
      expect(screen.getByTestId('site-equipment-editor-zone-row')).toBeInTheDocument()
    })

    test('removes a zone when ✕ clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add zone
      await user.click(screen.getByTestId('site-equipment-editor-add-zone'))
      expect(screen.getByTestId('site-equipment-editor-zone-row')).toBeInTheDocument()

      // Remove it
      const removeBtn = screen.getByTestId('site-equipment-editor-remove-zone')
      await user.click(removeBtn)

      expect(screen.queryByTestId('site-equipment-editor-zone-row')).not.toBeInTheDocument()
    })

    test('allows editing zone description', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add zone
      await user.click(screen.getByTestId('site-equipment-editor-add-zone'))

      // Find description input
      const descInput = screen.getByPlaceholderText('Description')
      await user.type(descInput, 'Front lawn area')

      expect(descInput).toHaveValue('Front lawn area')
    })

    test('allows toggling landscape types checkboxes', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add zone
      await user.click(screen.getByTestId('site-equipment-editor-add-zone'))

      // Find and click a landscape type checkbox
      const fullSunCheckbox = screen.getByLabelText('Full-sun turf')
      await user.click(fullSunCheckbox)

      expect(fullSunCheckbox).toBeChecked()

      // Uncheck it
      await user.click(fullSunCheckbox)
      expect(fullSunCheckbox).not.toBeChecked()
    })

    test('allows toggling irrigation types checkboxes', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add zone
      await user.click(screen.getByTestId('site-equipment-editor-add-zone'))

      // Find and click an irrigation type checkbox
      const rotorCheckbox = screen.getByLabelText('Rotor')
      await user.click(rotorCheckbox)

      expect(rotorCheckbox).toBeChecked()

      // Uncheck it
      await user.click(rotorCheckbox)
      expect(rotorCheckbox).not.toBeChecked()
    })

    test('controller dropdown is populated from added controllers', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add a controller first
      await user.click(screen.getByTestId('site-equipment-editor-add-controller'))

      // Edit controller to have a name
      const manufacturerInput = screen.getByPlaceholderText('Hunter')
      await user.type(manufacturerInput, 'Hunter')

      // Add a zone
      await user.click(screen.getByTestId('site-equipment-editor-add-zone'))

      // Find controller select in zone row
      const select = screen.getByDisplayValue('—')
      expect(select).toBeInTheDocument()

      // Open the select and verify controller option appears
      await user.click(select)
      const option = screen.getByRole('option', { name: /Hunter/ })
      expect(option).toBeInTheDocument()
    })
  })

  describe('backflows', () => {
    test('adds a backflow when + Backflow clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      await user.click(screen.getByTestId('site-equipment-editor-add-backflow'))

      expect(screen.getByTestId('site-equipment-editor-backflow-row')).toBeInTheDocument()
    })

    test('removes a backflow when ✕ clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add backflow
      await user.click(screen.getByTestId('site-equipment-editor-add-backflow'))
      expect(screen.getByTestId('site-equipment-editor-backflow-row')).toBeInTheDocument()

      // Remove it
      const removeBtn = screen.getByTestId('site-equipment-editor-remove-backflow')
      await user.click(removeBtn)

      expect(screen.queryByTestId('site-equipment-editor-backflow-row')).not.toBeInTheDocument()
    })

    test('allows editing backflow fields', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add backflow
      await user.click(screen.getByTestId('site-equipment-editor-add-backflow'))

      // Find inputs and edit them
      const manufacturerInputs = screen.getAllByPlaceholderText('Manufacturer')
      await user.type(manufacturerInputs[0], 'Watts')
      expect(manufacturerInputs[0]).toHaveValue('Watts')

      const typeInputs = screen.getAllByPlaceholderText('Type')
      await user.type(typeInputs[0], 'DCVA')
      expect(typeInputs[0]).toHaveValue('DCVA')
    })
  })

  describe('System Overview fields', () => {
    test('can edit static pressure field', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const input = screen.getByTestId('site-equipment-editor-overview-static-pressure')
      await user.type(input, '65')

      expect(input).toHaveValue('65')
    })

    test('can toggle backflow installed checkbox', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const checkbox = screen.getByTestId('site-equipment-editor-overview-backflow-installed')
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)
      expect(checkbox).toBeChecked()

      await user.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })

    test('can toggle backflow serviceable checkbox', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const checkbox = screen.getByTestId('site-equipment-editor-overview-backflow-serviceable')
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)
      expect(checkbox).toBeChecked()
    })

    test('can toggle isolation valve checkbox', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const checkbox = screen.getByTestId('site-equipment-editor-overview-isolation-valve')
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)
      expect(checkbox).toBeChecked()
    })

    test('can edit system notes textarea', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const textarea = screen.getByTestId('site-equipment-editor-overview-system-notes')
      await user.type(textarea, 'System needs maintenance')

      expect(textarea).toHaveValue('System needs maintenance')
    })
  })

  describe('Save functionality', () => {
    test('calls updateSiteEquipment with correct payload on Save', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      mockUpdateSiteEquipment.mockResolvedValue({ ok: true })

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add some equipment
      await user.click(screen.getByTestId('site-equipment-editor-add-controller'))
      const manufacturerInput = screen.getByPlaceholderText('Hunter')
      await user.type(manufacturerInput, 'Hunter')

      // Fill overview
      const staticPressureInput = screen.getByTestId('site-equipment-editor-overview-static-pressure')
      await user.type(staticPressureInput, '70')

      // Click Save
      await user.click(screen.getByTestId('site-equipment-editor-save'))

      // Wait for async save
      await waitFor(() => {
        expect(mockUpdateSiteEquipment).toHaveBeenCalledWith({
          siteId: 'site-1',
          controllers: expect.arrayContaining([
            expect.objectContaining({
              manufacturer: 'Hunter',
            }),
          ]),
          zones: [],
          backflows: [],
          overview: expect.objectContaining({
            staticPressure: '70',
          }),
        })
      })
    })

    test('shows loading state while saving', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      mockUpdateSiteEquipment.mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve({ ok: true }), 100)
          })
      )

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const saveBtn = screen.getByTestId('site-equipment-editor-save')
      await user.click(saveBtn)

      // While saving, button should show "Saving…"
      expect(saveBtn).toHaveTextContent('Saving…')
      expect(saveBtn).toBeDisabled()

      // Wait for save to complete
      await waitFor(() => {
        expect(saveBtn).toHaveTextContent('Save')
        expect(saveBtn).not.toBeDisabled()
      }, { timeout: 1000 })
    })

    test('shows success message on successful save', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      mockUpdateSiteEquipment.mockResolvedValue({ ok: true })

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      await user.click(screen.getByTestId('site-equipment-editor-save'))

      await waitFor(() => {
        const msg = screen.getByTestId('site-equipment-editor-save-message')
        expect(msg).toHaveTextContent('Equipment saved successfully.')
        expect(msg).toHaveStyle({ color: '#22c55e' })
      })
    })

    test('shows error message on failed save', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      mockUpdateSiteEquipment.mockResolvedValue({ ok: false, error: 'Database error' })

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      await user.click(screen.getByTestId('site-equipment-editor-save'))

      await waitFor(() => {
        const msg = screen.getByTestId('site-equipment-editor-save-message')
        expect(msg).toHaveTextContent('Database error')
        expect(msg).toHaveStyle({ color: '#ef4444' })
      })
    })

    test('handles unexpected error during save', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      mockUpdateSiteEquipment.mockRejectedValue(new Error('Network error'))

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      await user.click(screen.getByTestId('site-equipment-editor-save'))

      await waitFor(() => {
        const msg = screen.getByTestId('site-equipment-editor-save-message')
        expect(msg).toHaveTextContent('An unexpected error occurred.')
      })
    })

    test('disables Save and Cancel buttons while saving', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      mockUpdateSiteEquipment.mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve({ ok: true }), 100)
          })
      )

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const saveBtn = screen.getByTestId('site-equipment-editor-save')
      const cancelBtn = screen.getByTestId('site-equipment-editor-cancel')

      await user.click(saveBtn)

      // Both buttons should be disabled while saving
      expect(saveBtn).toBeDisabled()
      expect(cancelBtn).toBeDisabled()

      // Wait for save to complete
      await waitFor(() => {
        expect(saveBtn).not.toBeDisabled()
        expect(cancelBtn).not.toBeDisabled()
      }, { timeout: 1000 })
    })

    test('calls onSave callback after successful save', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      const onSave = jest.fn()
      mockUpdateSiteEquipment.mockResolvedValue({ ok: true })

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} onSave={onSave} />)

      await user.click(screen.getByTestId('site-equipment-editor-save'))

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled()
      })
    })
  })

  describe('Cancel functionality', () => {
    test('calls onClose when Cancel clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      await user.click(screen.getByTestId('site-equipment-editor-cancel'))

      expect(onClose).toHaveBeenCalled()
    })

    test('does not save when Cancel clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add some equipment
      await user.click(screen.getByTestId('site-equipment-editor-add-controller'))

      // Click Cancel
      await user.click(screen.getByTestId('site-equipment-editor-cancel'))

      // updateSiteEquipment should not have been called
      expect(mockUpdateSiteEquipment).not.toHaveBeenCalled()
    })

    test('disables Cancel button while saving', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      mockUpdateSiteEquipment.mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve({ ok: true }), 100)
          })
      )

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const cancelBtn = screen.getByTestId('site-equipment-editor-cancel')
      const saveBtn = screen.getByTestId('site-equipment-editor-save')

      await user.click(saveBtn)

      expect(cancelBtn).toBeDisabled()

      await waitFor(() => {
        expect(cancelBtn).not.toBeDisabled()
      }, { timeout: 1000 })
    })
  })

  describe('multiple add/remove cycles', () => {
    test('handles adding and removing multiple controllers in sequence', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const addBtn = screen.getByTestId('site-equipment-editor-add-controller')

      // Add 3 controllers
      await user.click(addBtn)
      await user.click(addBtn)
      await user.click(addBtn)

      expect(screen.getAllByTestId('site-equipment-editor-controller-row')).toHaveLength(3)

      // Remove the middle one
      const removeButtons = screen.getAllByTestId('site-equipment-editor-remove-controller')
      await user.click(removeButtons[1])

      expect(screen.getAllByTestId('site-equipment-editor-controller-row')).toHaveLength(2)

      // Add another
      await user.click(addBtn)
      expect(screen.getAllByTestId('site-equipment-editor-controller-row')).toHaveLength(3)
    })

    test('handles adding and removing multiple zones in sequence', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const addBtn = screen.getByTestId('site-equipment-editor-add-zone')

      // Add 2 zones
      await user.click(addBtn)
      await user.click(addBtn)

      expect(screen.getAllByTestId('site-equipment-editor-zone-row')).toHaveLength(2)

      // Remove first
      const removeButtons = screen.getAllByTestId('site-equipment-editor-remove-zone')
      await user.click(removeButtons[0])

      expect(screen.getAllByTestId('site-equipment-editor-zone-row')).toHaveLength(1)
    })
  })

  describe('state isolation', () => {
    test('editing one controller does not affect another', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add 2 controllers
      await user.click(screen.getByTestId('site-equipment-editor-add-controller'))
      await user.click(screen.getByTestId('site-equipment-editor-add-controller'))

      // Edit first controller's manufacturer
      const manufacturerInputs = screen.getAllByPlaceholderText('Hunter')
      await user.type(manufacturerInputs[0], 'Hunter')

      // Edit second controller's model
      const modelInputs = screen.getAllByPlaceholderText('Pro-HC')
      await user.type(modelInputs[1], 'Rachio')

      // Verify independence
      expect(manufacturerInputs[0]).toHaveValue('Hunter')
      expect(modelInputs[1]).toHaveValue('Rachio')
    })
  })

  describe('site without address/client', () => {
    test('renders site with minimal info (no address, no client)', () => {
      const onClose = jest.fn()
      const minimalSite: SiteWithClient = {
        id: 'site-2',
        companyId: 'company-1',
        name: 'Minimal Site',
        address: null,
        clientId: null,
        notes: null,
        createdAt: new Date(),
        clientName: null,
        clientAddress: null,
      }

      render(<SiteEquipmentEditor site={minimalSite} onClose={onClose} />)

      expect(screen.getByText('Minimal Site')).toBeInTheDocument()
      expect(screen.queryByText(/123 Main St/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Client:/)).not.toBeInTheDocument()
    })
  })
})
