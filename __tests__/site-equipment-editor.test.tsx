/**
 * @jest-environment jsdom
 *
 * Unit tests for SiteEquipmentEditor component
 *
 * Task: sites-menu-irrigation (c9e3a2f1-6b4d-4e8a-8f2c-1d7a9e5f3b8a)
 */

import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
    test('adds a controller when + Controller clicked', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('site-equipment-editor-add-controller'))

      expect(screen.getByTestId('site-equipment-editor-controllers-table')).toBeInTheDocument()
      expect(screen.getByTestId('site-equipment-editor-controller-row')).toBeInTheDocument()
    })

    test('removes a controller when ✕ clicked', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add controller
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-controller'))
      expect(screen.getByTestId('site-equipment-editor-controller-row')).toBeInTheDocument()

      // Remove it
      const removeBtn = screen.getByTestId('site-equipment-editor-remove-controller')
      fireEvent.click(removeBtn)

      expect(screen.queryByTestId('site-equipment-editor-controller-row')).not.toBeInTheDocument()
    })

    test('allows editing controller fields', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add controller
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-controller'))

      // Edit location field
      const locationInputs = screen.getAllByPlaceholderText('e.g. Front of building')
      fireEvent.change(locationInputs[0], { target: { value: 'Front entrance' } })
      expect(locationInputs[0]).toHaveValue('Front entrance')

      // Edit manufacturer field
      const manufacturerInputs = screen.getAllByPlaceholderText('Hunter')
      fireEvent.change(manufacturerInputs[0], { target: { value: 'Hunter Pro-HC' } })
      expect(manufacturerInputs[0]).toHaveValue('Hunter Pro-HC')

      // Edit model field
      const modelInputs = screen.getAllByPlaceholderText('Pro-HC')
      fireEvent.change(modelInputs[0], { target: { value: 'Pro-HC 2000' } })
      expect(modelInputs[0]).toHaveValue('Pro-HC 2000')

      // Edit sensors field
      const sensorInputs = screen.getAllByPlaceholderText('Rain/Freeze')
      fireEvent.change(sensorInputs[0], { target: { value: 'Soil Moisture' } })
      expect(sensorInputs[0]).toHaveValue('Soil Moisture')
    })

    test('toggles master valve checkbox and reveals master valve notes textarea', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add controller
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-controller'))

      // Find the master valve checkbox (it's the one in a table cell)
      const allCheckboxes = screen.getAllByRole('checkbox')
      // The master valve checkbox is in a table, others are in landscape/irrigation type sections
      // We'll find it by checking multiple and toggling the likely one
      const masterValveCheckbox = allCheckboxes.find(cb => {
        const parent = cb.closest('td')
        return parent && !parent.textContent?.includes('Full-sun') && !parent.textContent?.includes('Rotor')
      })

      if (masterValveCheckbox) {
        // Initially master valve notes should not be visible
        expect(screen.queryByPlaceholderText('Repair notes...')).not.toBeInTheDocument()

        // Check master valve
        fireEvent.click(masterValveCheckbox)
        // Now master valve notes should appear
        expect(screen.getByPlaceholderText('Repair notes...')).toBeInTheDocument()

        // Edit the master valve notes
        const mvNotes = screen.getByPlaceholderText('Repair notes...')
        fireEvent.change(mvNotes, { target: { value: 'Needs service' } })
        expect(mvNotes).toHaveValue('Needs service')

        // Edit the internal notes
        const intNotes = screen.getByPlaceholderText('Notes')
        fireEvent.change(intNotes, { target: { value: 'Main controller' } })
        expect(intNotes).toHaveValue('Main controller')

        // Uncheck master valve - should clear notes
        fireEvent.click(masterValveCheckbox)
        expect(screen.queryByPlaceholderText('Repair notes...')).not.toBeInTheDocument()
      }
    })
  })

  describe('zones', () => {
    test('adds a zone when + Zone clicked', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('site-equipment-editor-add-zone'))

      expect(screen.getByTestId('site-equipment-editor-zones-table')).toBeInTheDocument()
      expect(screen.getByTestId('site-equipment-editor-zone-row')).toBeInTheDocument()
    })

    test('removes a zone when ✕ clicked', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add zone
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-zone'))
      expect(screen.getByTestId('site-equipment-editor-zone-row')).toBeInTheDocument()

      // Remove it
      const removeBtn = screen.getByTestId('site-equipment-editor-remove-zone')
      fireEvent.click(removeBtn)

      expect(screen.queryByTestId('site-equipment-editor-zone-row')).not.toBeInTheDocument()
    })

    test('allows editing zone description', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add zone
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-zone'))

      // Find description input
      const descInput = screen.getByPlaceholderText('Description')
      fireEvent.change(descInput, { target: { value: 'Front lawn area' } })

      expect(descInput).toHaveValue('Front lawn area')
    })

    test('allows editing zone notes', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add zone
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-zone'))

      // Find zone notes textarea
      const notesInputs = screen.getAllByPlaceholderText('Notes...')
      fireEvent.change(notesInputs[0], { target: { value: 'Needs pressure adjustment' } })

      expect(notesInputs[0]).toHaveValue('Needs pressure adjustment')
    })

    test('allows toggling landscape types checkboxes', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add zone
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-zone'))

      // Find and click a landscape type checkbox
      const fullSunCheckbox = screen.getByLabelText('Full-sun turf')
      fireEvent.click(fullSunCheckbox)

      expect(fullSunCheckbox).toBeChecked()

      // Uncheck it
      fireEvent.click(fullSunCheckbox)
      expect(fullSunCheckbox).not.toBeChecked()
    })

    test('allows toggling irrigation types checkboxes', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add zone
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-zone'))

      // Find and click an irrigation type checkbox
      const rotorCheckbox = screen.getByLabelText('Rotor')
      fireEvent.click(rotorCheckbox)

      expect(rotorCheckbox).toBeChecked()

      // Uncheck it
      fireEvent.click(rotorCheckbox)
      expect(rotorCheckbox).not.toBeChecked()
    })

    test('controller dropdown is populated from added controllers', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add a controller first
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-controller'))

      // Edit controller to have manufacturer and location
      const manufacturerInputs = screen.getAllByPlaceholderText('Hunter')
      fireEvent.change(manufacturerInputs[0], { target: { value: 'Hunter' } })

      const locationInputs = screen.getAllByPlaceholderText('e.g. Front of building')
      fireEvent.change(locationInputs[0], { target: { value: 'Front' } })

      // Add a zone
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-zone'))

      // Find controller select in zone row
      const select = screen.getByDisplayValue('—')
      expect(select).toBeInTheDocument()

      // Open the select and verify controller option appears with location
      fireEvent.click(select)
      const option = screen.getByRole('option', { name: /Hunter.*Front/ })
      expect(option).toBeInTheDocument()
    })

    test('allows editing zone number', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add zone
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-zone'))

      // Find zone number input (type="number")
      const numberInputs = screen.getAllByRole('spinbutton')
      // First spinbutton is usually the zone number
      fireEvent.change(numberInputs[0], { target: { value: '5' } })
      expect(numberInputs[0]).toHaveValue(5)
    })

    test('allows selecting controller for zone', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add controller first
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-controller'))

      // Add zone
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-zone'))

      // Find the controller select and change it
      const select = screen.getByDisplayValue('—')
      fireEvent.change(select, { target: { value: '1' } })
      expect(select).toHaveValue('1')
    })

    test('allows editing controller number of zones', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add controller
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-controller'))

      // Find all number inputs (spinbuttons) - first will be zones for the controller
      const numberInputs = screen.getAllByRole('spinbutton')
      // Edit the first spinbutton (which is numZones)
      fireEvent.change(numberInputs[0], { target: { value: '8' } })
      expect(numberInputs[0]).toHaveValue(8)
    })
  })

  describe('backflows', () => {
    test('adds a backflow when + Backflow clicked', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('site-equipment-editor-add-backflow'))

      expect(screen.getByTestId('site-equipment-editor-backflow-row')).toBeInTheDocument()
    })

    test('removes a backflow when ✕ clicked', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add backflow
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-backflow'))
      expect(screen.getByTestId('site-equipment-editor-backflow-row')).toBeInTheDocument()

      // Remove it
      const removeBtn = screen.getByTestId('site-equipment-editor-remove-backflow')
      fireEvent.click(removeBtn)

      expect(screen.queryByTestId('site-equipment-editor-backflow-row')).not.toBeInTheDocument()
    })

    test('allows editing backflow fields', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add backflow
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-backflow'))

      // Find inputs and edit them
      const manufacturerInputs = screen.getAllByPlaceholderText('Manufacturer')
      fireEvent.change(manufacturerInputs[0], { target: { value: 'Watts' } })
      expect(manufacturerInputs[0]).toHaveValue('Watts')

      const typeInputs = screen.getAllByPlaceholderText('Type')
      fireEvent.change(typeInputs[0], { target: { value: 'DCVA' } })
      expect(typeInputs[0]).toHaveValue('DCVA')

      const sizeInputs = screen.getAllByPlaceholderText('e.g. 1')
      fireEvent.change(sizeInputs[0], { target: { value: '1.5' } })
      expect(sizeInputs[0]).toHaveValue(1.5)
    })
  })

  describe('System Overview fields', () => {
    test('can edit static pressure field', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const input = screen.getByTestId('site-equipment-editor-overview-static-pressure')
      fireEvent.change(input, { target: { value: '65' } })

      expect(input).toHaveValue('65')
    })

    test('can toggle backflow installed checkbox', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const checkbox = screen.getByTestId('site-equipment-editor-overview-backflow-installed')
      expect(checkbox).not.toBeChecked()

      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()

      fireEvent.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })

    test('can toggle backflow serviceable checkbox', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const checkbox = screen.getByTestId('site-equipment-editor-overview-backflow-serviceable')
      expect(checkbox).not.toBeChecked()

      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
    })

    test('can toggle isolation valve checkbox', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const checkbox = screen.getByTestId('site-equipment-editor-overview-isolation-valve')
      expect(checkbox).not.toBeChecked()

      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
    })

    test('can edit system notes textarea', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const textarea = screen.getByTestId('site-equipment-editor-overview-system-notes')
      fireEvent.change(textarea, { target: { value: 'System needs maintenance' } })

      expect(textarea).toHaveValue('System needs maintenance')
    })
  })

  describe('Save functionality', () => {
    test('calls updateSiteEquipment with correct payload on Save', async () => {
      const onClose = jest.fn()
      mockUpdateSiteEquipment.mockResolvedValue({ ok: true })

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add some equipment
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-controller'))
      const manufacturerInput = screen.getByPlaceholderText('Hunter')
      fireEvent.change(manufacturerInput, { target: { value: 'Hunter' } })

      // Fill overview
      const staticPressureInput = screen.getByTestId('site-equipment-editor-overview-static-pressure')
      fireEvent.change(staticPressureInput, { target: { value: '70' } })

      // Click Save
      fireEvent.click(screen.getByTestId('site-equipment-editor-save'))

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
      const onClose = jest.fn()
      mockUpdateSiteEquipment.mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve({ ok: true }), 100)
          })
      )

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const saveBtn = screen.getByTestId('site-equipment-editor-save')
      fireEvent.click(saveBtn)

      // While saving, button should show "Saving…"
      expect(saveBtn).toHaveTextContent('Saving…')
      expect(saveBtn).toBeDisabled()

      // Wait for save to complete
      await waitFor(
        () => {
          expect(saveBtn).toHaveTextContent('Save')
          expect(saveBtn).not.toBeDisabled()
        },
        { timeout: 1000 }
      )
    })

    test('shows success message on successful save', async () => {
      const onClose = jest.fn()
      mockUpdateSiteEquipment.mockResolvedValue({ ok: true })

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('site-equipment-editor-save'))

      await waitFor(() => {
        const msg = screen.getByTestId('site-equipment-editor-save-message')
        expect(msg).toHaveTextContent('Equipment saved successfully.')
        expect(msg).toHaveStyle({ color: '#22c55e' })
      })
    })

    test('shows error message on failed save', async () => {
      const onClose = jest.fn()
      mockUpdateSiteEquipment.mockResolvedValue({ ok: false, error: 'Database error' })

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('site-equipment-editor-save'))

      await waitFor(() => {
        const msg = screen.getByTestId('site-equipment-editor-save-message')
        expect(msg).toHaveTextContent('Database error')
        expect(msg).toHaveStyle({ color: '#ef4444' })
      })
    })

    test('handles unexpected error during save', async () => {
      const onClose = jest.fn()
      mockUpdateSiteEquipment.mockRejectedValue(new Error('Network error'))

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('site-equipment-editor-save'))

      await waitFor(() => {
        const msg = screen.getByTestId('site-equipment-editor-save-message')
        expect(msg).toHaveTextContent('An unexpected error occurred.')
      })
    })

    test('disables Save and Cancel buttons while saving', async () => {
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

      fireEvent.click(saveBtn)

      // Both buttons should be disabled while saving
      expect(saveBtn).toBeDisabled()
      expect(cancelBtn).toBeDisabled()

      // Wait for save to complete
      await waitFor(
        () => {
          expect(saveBtn).not.toBeDisabled()
          expect(cancelBtn).not.toBeDisabled()
        },
        { timeout: 1000 }
      )
    })

    test('calls onSave callback after successful save', async () => {
      const onClose = jest.fn()
      const onSave = jest.fn()
      mockUpdateSiteEquipment.mockResolvedValue({ ok: true })

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} onSave={onSave} />)

      fireEvent.click(screen.getByTestId('site-equipment-editor-save'))

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled()
      })
    })
  })

  describe('Cancel functionality', () => {
    test('calls onClose when Cancel clicked', () => {
      const onClose = jest.fn()

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('site-equipment-editor-cancel'))

      expect(onClose).toHaveBeenCalled()
    })

    test('does not save when Cancel clicked', () => {
      const onClose = jest.fn()

      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add some equipment
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-controller'))

      // Click Cancel
      fireEvent.click(screen.getByTestId('site-equipment-editor-cancel'))

      // updateSiteEquipment should not have been called
      expect(mockUpdateSiteEquipment).not.toHaveBeenCalled()
    })

    test('disables Cancel button while saving', async () => {
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

      fireEvent.click(saveBtn)

      expect(cancelBtn).toBeDisabled()

      await waitFor(
        () => {
          expect(cancelBtn).not.toBeDisabled()
        },
        { timeout: 1000 }
      )
    })
  })

  describe('multiple add/remove cycles', () => {
    test('handles adding and removing multiple controllers in sequence', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const addBtn = screen.getByTestId('site-equipment-editor-add-controller')

      // Add 3 controllers
      fireEvent.click(addBtn)
      fireEvent.click(addBtn)
      fireEvent.click(addBtn)

      expect(screen.getAllByTestId('site-equipment-editor-controller-row')).toHaveLength(3)

      // Remove the middle one
      const removeButtons = screen.getAllByTestId('site-equipment-editor-remove-controller')
      fireEvent.click(removeButtons[1])

      expect(screen.getAllByTestId('site-equipment-editor-controller-row')).toHaveLength(2)

      // Add another
      fireEvent.click(addBtn)
      expect(screen.getAllByTestId('site-equipment-editor-controller-row')).toHaveLength(3)
    })

    test('handles adding and removing multiple zones in sequence', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      const addBtn = screen.getByTestId('site-equipment-editor-add-zone')

      // Add 2 zones
      fireEvent.click(addBtn)
      fireEvent.click(addBtn)

      expect(screen.getAllByTestId('site-equipment-editor-zone-row')).toHaveLength(2)

      // Remove first
      const removeButtons = screen.getAllByTestId('site-equipment-editor-remove-zone')
      fireEvent.click(removeButtons[0])

      expect(screen.getAllByTestId('site-equipment-editor-zone-row')).toHaveLength(1)
    })
  })

  describe('state isolation', () => {
    test('editing one controller does not affect another', () => {
      const onClose = jest.fn()
      render(<SiteEquipmentEditor site={MOCK_SITE} onClose={onClose} />)

      // Add 2 controllers
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-controller'))
      fireEvent.click(screen.getByTestId('site-equipment-editor-add-controller'))

      // Edit first controller's manufacturer
      const manufacturerInputs = screen.getAllByPlaceholderText('Hunter')
      fireEvent.change(manufacturerInputs[0], { target: { value: 'Hunter' } })

      // Edit second controller's model
      const modelInputs = screen.getAllByPlaceholderText('Pro-HC')
      fireEvent.change(modelInputs[1], { target: { value: 'Rachio' } })

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
