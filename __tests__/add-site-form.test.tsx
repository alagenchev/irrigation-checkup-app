/**
 * @jest-environment jsdom
 *
 * Unit tests for AddSiteForm two-phase behaviour
 *
 * Task: add-site-with-equipment (f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c)
 */

import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { AddSiteForm } from '@/app/sites/add-site-form'
import type { Client } from '@/types'

jest.mock('@/actions/sites', () => ({
  createSite: jest.fn(),
}))

jest.mock('@/app/sites/site-equipment-editor', () => ({
  SiteEquipmentEditor: ({ site, onClose, onSave }: any) => (
    <div data-testid="site-equipment-editor">
      <span data-testid="editor-site-name">{site.name}</span>
      <button data-testid="equipment-editor-save" onClick={onSave}>Save</button>
      <button data-testid="equipment-editor-cancel" onClick={onClose}>Cancel</button>
    </div>
  ),
}))

jest.mock('@/components/ui/autocomplete', () => ({
  Autocomplete: ({ name, value, onChange, placeholder }: any) => (
    <input name={name} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  ),
}))

jest.mock('@/components/ui/address-autocomplete', () => ({
  AddressAutocomplete: ({ name, value, onChange, placeholder }: any) => (
    <input name={name} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  ),
}))

import { createSite } from '@/actions/sites'
const mockCreateSite = createSite as jest.MockedFunction<typeof createSite>

const MOCK_CLIENTS: Client[] = [
  { id: 'c-1', companyId: 'co-1', name: 'Acme Corp', address: '1 Corp Way', phone: null, email: null, accountType: null, accountNumber: null, createdAt: new Date() },
  { id: 'c-2', companyId: 'co-1', name: 'Beta Inc', address: null, phone: null, email: null, accountType: null, accountNumber: null, createdAt: new Date() },
]

const CREATED_SITE = {
  id: 'site-new',
  companyId: 'co-1',
  name: 'New Site',
  address: '99 New St',
  clientId: null,
  notes: null,
  createdAt: new Date(),
}

beforeEach(() => {
  mockCreateSite.mockReset()
})

describe('AddSiteForm', () => {

  describe('phase 1 — site creation form', () => {
    it('renders the site name input', () => {
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      expect(screen.getByPlaceholderText(/acme hq/i)).toBeInTheDocument()
    })

    it('renders the Add Site submit button', () => {
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      expect(screen.getByRole('button', { name: /add site/i })).toBeInTheDocument()
    })

    it('does NOT render the equipment editor in phase 1', () => {
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      expect(screen.queryByTestId('site-equipment-editor')).not.toBeInTheDocument()
    })

    it('renders address, client, and notes fields', () => {
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      expect(screen.getByPlaceholderText(/123 main st/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/type or select a client/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/optional notes/i)).toBeInTheDocument()
    })

    it('shows a validation error when createSite returns an error', async () => {
      mockCreateSite.mockResolvedValue({ ok: false, error: 'Name is required' })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      fireEvent.change(screen.getByPlaceholderText(/acme hq/i), { target: { value: 'x' } })
      await act(async () => {
        fireEvent.submit(screen.getByTestId('add-site-form'))
      })
      expect(await screen.findByText('Name is required')).toBeInTheDocument()
    })

    it('shows "Saving…" on the button while the action is in flight', async () => {
      let resolve: any
      mockCreateSite.mockImplementation(() => new Promise(r => { resolve = r }))
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      fireEvent.change(screen.getByPlaceholderText(/acme hq/i), { target: { value: 'My Site' } })
      await act(async () => {
        fireEvent.submit(screen.getByTestId('add-site-form'))
      })
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
      // clean up — resolve the promise
      await act(async () => { resolve({ ok: false, error: 'err' }) })
    })

    it('submits form with all fields populated (address, client, notes)', async () => {
      mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      fireEvent.change(screen.getByPlaceholderText(/acme hq/i), { target: { value: 'My Site' } })
      fireEvent.change(screen.getByPlaceholderText(/123 main st/i), { target: { value: '456 Oak Ave' } })
      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: 'Acme Corp' } })
      fireEvent.change(screen.getByPlaceholderText(/optional notes/i), { target: { value: 'Test notes' } })
      await act(async () => {
        fireEvent.submit(screen.getByTestId('add-site-form'))
      })
      await screen.findByTestId('add-site-equipment-phase')
      expect(mockCreateSite).toHaveBeenCalledWith(
        null,
        expect.any(FormData)
      )
    })
  })

  describe('phase 2 — equipment editor after successful creation', () => {
    async function createSiteAndTransition() {
      mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      fireEvent.change(screen.getByPlaceholderText(/acme hq/i), { target: { value: 'New Site' } })
      await act(async () => {
        fireEvent.submit(screen.getByTestId('add-site-form'))
      })
      await screen.findByTestId('add-site-equipment-phase')
    }

    it('transitions to phase 2 after successful createSite', async () => {
      await createSiteAndTransition()
      expect(screen.getByTestId('site-equipment-editor')).toBeInTheDocument()
    })

    it('shows the newly created site name in phase 2', async () => {
      await createSiteAndTransition()
      expect(screen.getByTestId('editor-site-name')).toHaveTextContent('New Site')
    })

    it('shows a "Skip" button in phase 2', async () => {
      await createSiteAndTransition()
      expect(screen.getByTestId('add-site-skip-equipment')).toBeInTheDocument()
    })

    it('does NOT show the site creation form in phase 2', async () => {
      await createSiteAndTransition()
      expect(screen.queryByRole('button', { name: /add site/i })).not.toBeInTheDocument()
    })
  })

  describe('reset — returning to phase 1', () => {
    async function reachPhase2() {
      mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      fireEvent.change(screen.getByPlaceholderText(/acme hq/i), { target: { value: 'New Site' } })
      await act(async () => {
        fireEvent.submit(screen.getByTestId('add-site-form'))
      })
      await screen.findByTestId('add-site-equipment-phase')
    }

    it('clicking Skip returns to phase 1', async () => {
      await reachPhase2()
      fireEvent.click(screen.getByTestId('add-site-skip-equipment'))
      expect(await screen.findByRole('button', { name: /add site/i })).toBeInTheDocument()
      expect(screen.queryByTestId('site-equipment-editor')).not.toBeInTheDocument()
    })

    it('equipment editor Save returns to phase 1', async () => {
      await reachPhase2()
      fireEvent.click(screen.getByTestId('equipment-editor-save'))
      expect(await screen.findByRole('button', { name: /add site/i })).toBeInTheDocument()
    })

    it('equipment editor Cancel returns to phase 1', async () => {
      await reachPhase2()
      fireEvent.click(screen.getByTestId('equipment-editor-cancel'))
      expect(await screen.findByRole('button', { name: /add site/i })).toBeInTheDocument()
    })

    it('form fields are cleared after returning to phase 1', async () => {
      await reachPhase2()
      fireEvent.click(screen.getByTestId('add-site-skip-equipment'))
      const nameInput = await screen.findByPlaceholderText(/acme hq/i)
      expect(nameInput).toHaveValue('')
    })

    it('error message is cleared after returning to phase 1', async () => {
      mockCreateSite.mockResolvedValueOnce({ ok: false, error: 'Something went wrong' })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      await act(async () => {
        fireEvent.submit(screen.getByTestId('add-site-form'))
      })
      expect(await screen.findByText('Something went wrong')).toBeInTheDocument()

      mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
      fireEvent.change(screen.getByPlaceholderText(/acme hq/i), { target: { value: 'New Site' } })
      await act(async () => {
        fireEvent.submit(screen.getByTestId('add-site-form'))
      })
      await screen.findByTestId('add-site-equipment-phase')
      fireEvent.click(screen.getByTestId('add-site-skip-equipment'))

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  describe('new client detection', () => {
    it('does NOT show new-client-details when client field is empty', () => {
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      expect(screen.queryByTestId('new-client-details')).not.toBeInTheDocument()
    })

    it('does NOT show new-client-details when typed name matches an existing client', async () => {
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: 'Acme Corp' } })
      expect(screen.queryByTestId('new-client-details')).not.toBeInTheDocument()
    })

    it('shows new-client-details when typed name does not match any existing client', async () => {
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: 'Brand New Client' } })
      expect(screen.getByTestId('new-client-details')).toBeInTheDocument()
    })

    it('hides new-client-details again if user clears the client field', async () => {
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: 'Brand New Client' } })
      expect(screen.getByTestId('new-client-details')).toBeInTheDocument()
      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: '' } })
      expect(screen.queryByTestId('new-client-details')).not.toBeInTheDocument()
    })
  })

  describe('new client field inputs', () => {
    it('renders phone, email, account type, and account number inputs when new client section is visible', async () => {
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: 'New Client' } })
      expect(screen.getByTestId('new-client-phone')).toBeInTheDocument()
      expect(screen.getByTestId('new-client-email')).toBeInTheDocument()
      expect(screen.getByTestId('new-client-account-type')).toBeInTheDocument()
      expect(screen.getByTestId('new-client-account-number')).toBeInTheDocument()
    })

    it('account type select defaults to Residential', async () => {
      render(<AddSiteForm clients={MOCK_CLIENTS} />)
      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: 'New Client' } })
      expect(screen.getByTestId('new-client-account-type')).toHaveValue('Residential')
    })
  })

  describe('form submission with new client fields', () => {
    it('includes client phone and email in FormData when submitting a new client', async () => {
      mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)

      fireEvent.change(screen.getByPlaceholderText(/acme hq/i), { target: { value: 'Test Site' } })
      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: 'New Client' } })
      fireEvent.change(screen.getByTestId('new-client-phone'), { target: { value: '555-1234' } })
      fireEvent.change(screen.getByTestId('new-client-email'), { target: { value: 'new@test.com' } })
      await act(async () => {
        fireEvent.submit(screen.getByTestId('add-site-form'))
      })

      const fd = mockCreateSite.mock.calls[0][1] as FormData
      expect(fd.get('client_phone')).toBe('555-1234')
      expect(fd.get('client_email')).toBe('new@test.com')
    })

    it('includes account type and account number in FormData when submitting a new client', async () => {
      mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)

      fireEvent.change(screen.getByPlaceholderText(/acme hq/i), { target: { value: 'Test Site' } })
      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: 'New Client' } })
      fireEvent.change(screen.getByTestId('new-client-account-type'), { target: { value: 'Commercial' } })
      fireEvent.change(screen.getByTestId('new-client-account-number'), { target: { value: 'ACC-001' } })
      await act(async () => {
        fireEvent.submit(screen.getByTestId('add-site-form'))
      })

      const fd = mockCreateSite.mock.calls[0][1] as FormData
      expect(fd.get('client_account_type')).toBe('Commercial')
      expect(fd.get('client_account_number')).toBe('ACC-001')
    })

    it('does NOT include client detail fields when linking an existing client', async () => {
      mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)

      fireEvent.change(screen.getByPlaceholderText(/acme hq/i), { target: { value: 'Test Site' } })
      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: 'Acme Corp' } })
      await act(async () => {
        fireEvent.submit(screen.getByTestId('add-site-form'))
      })

      const fd = mockCreateSite.mock.calls[0][1] as FormData
      expect(fd.get('client_phone')).toBeNull()
      expect(fd.get('client_email')).toBeNull()
      expect(fd.get('client_account_type')).toBeNull()
      expect(fd.get('client_account_number')).toBeNull()
    })

    it('does NOT include empty new client fields in FormData', async () => {
      mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)

      fireEvent.change(screen.getByPlaceholderText(/acme hq/i), { target: { value: 'Test Site' } })
      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: 'New Client' } })
      // Don't fill in phone/email/account fields
      await act(async () => {
        fireEvent.submit(screen.getByTestId('add-site-form'))
      })

      const fd = mockCreateSite.mock.calls[0][1] as FormData
      expect(fd.get('client_phone')).toBeNull()
      expect(fd.get('client_email')).toBeNull()
      expect(fd.get('client_account_number')).toBeNull()
      // accountType always gets included (defaults to Residential)
      expect(fd.get('client_account_type')).toBe('Residential')
    })

    it('sends all new client fields when user fills them in', async () => {
      mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)

      fireEvent.change(screen.getByPlaceholderText(/acme hq/i), { target: { value: 'Full Form Site' } })
      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: 'Full Client' } })
      fireEvent.change(screen.getByTestId('new-client-phone'), { target: { value: '555-7777' } })
      fireEvent.change(screen.getByTestId('new-client-email'), { target: { value: 'full@test.com' } })
      fireEvent.change(screen.getByTestId('new-client-account-type'), { target: { value: 'HOA' } })
      fireEvent.change(screen.getByTestId('new-client-account-number'), { target: { value: 'HOA-999' } })
      await act(async () => {
        fireEvent.submit(screen.getByTestId('add-site-form'))
      })

      const fd = mockCreateSite.mock.calls[0][1] as FormData
      expect(fd.get('client_phone')).toBe('555-7777')
      expect(fd.get('client_email')).toBe('full@test.com')
      expect(fd.get('client_account_type')).toBe('HOA')
      expect(fd.get('client_account_number')).toBe('HOA-999')
    })
  })

  describe('form reset clears new client fields', () => {
    it('new client fields are cleared when the form resets after successful submission', async () => {
      mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)

      fireEvent.change(screen.getByPlaceholderText(/acme hq/i), { target: { value: 'Test Site' } })
      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: 'Brand New' } })
      fireEvent.change(screen.getByTestId('new-client-phone'), { target: { value: '555-9999' } })
      await act(async () => {
        fireEvent.submit(screen.getByTestId('add-site-form'))
      })

      await screen.findByTestId('add-site-equipment-phase')
      fireEvent.click(screen.getByTestId('add-site-skip-equipment'))

      // Back in phase 1 — new-client-details should not be showing
      await screen.findByRole('button', { name: /add site/i })
      expect(screen.queryByTestId('new-client-details')).not.toBeInTheDocument()
    })

    it('new client phone input is cleared after returning to phase 1', async () => {
      mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)

      fireEvent.change(screen.getByPlaceholderText(/acme hq/i), { target: { value: 'Test Site' } })
      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: 'New Client' } })
      fireEvent.change(screen.getByTestId('new-client-phone'), { target: { value: '555-1111' } })
      await act(async () => {
        fireEvent.submit(screen.getByTestId('add-site-form'))
      })

      await screen.findByTestId('add-site-equipment-phase')
      fireEvent.click(screen.getByTestId('add-site-skip-equipment'))

      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: 'Another New' } })
      expect(screen.getByTestId('new-client-phone')).toHaveValue('')
    })

    it('account type resets to Residential after form reset', async () => {
      mockCreateSite.mockResolvedValue({ ok: true, data: CREATED_SITE })
      render(<AddSiteForm clients={MOCK_CLIENTS} />)

      fireEvent.change(screen.getByPlaceholderText(/acme hq/i), { target: { value: 'Test Site' } })
      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: 'New Client' } })
      fireEvent.change(screen.getByTestId('new-client-account-type'), { target: { value: 'Commercial' } })
      await act(async () => {
        fireEvent.submit(screen.getByTestId('add-site-form'))
      })

      await screen.findByTestId('add-site-equipment-phase')
      fireEvent.click(screen.getByTestId('add-site-skip-equipment'))

      fireEvent.change(screen.getByPlaceholderText(/type or select a client/i), { target: { value: 'Another' } })
      expect(screen.getByTestId('new-client-account-type')).toHaveValue('Residential')
    })
  })

})
