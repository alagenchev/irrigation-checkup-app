/**
 * Integration tests for createSite with new client inline fields
 *
 * Task: new-client-inline-fields (e9f0a1b2-c3d4-4e5f-9a0b-1c2d3e4f5a6b)
 */

import { and, eq } from 'drizzle-orm'
import { startTestDb, stopTestDb, withRollback, TEST_COMPANY_ID } from '../../test/helpers/db'
import { db } from '@/lib/db'
import { clients, sites } from '@/lib/schema'

// Mock tenant before importing the action
jest.mock('@/lib/tenant', () => ({
  getRequiredCompanyId: jest.fn().mockResolvedValue(TEST_COMPANY_ID),
}))

// Import after mock
import { createSite } from '@/actions/sites'

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

describe('createSite — new client with inline fields', () => {
  it('creates a new client with phone, email, accountType, accountNumber', async () => {
    await withRollback(async () => {
      const fd = new FormData()
      fd.set('name', 'E2E Integration Site')
      fd.set('client_name', 'Integration Test Client')
      fd.set('client_phone', '555-0001')
      fd.set('client_email', 'integration@test.com')
      fd.set('client_account_type', 'Commercial')
      fd.set('client_account_number', 'ACC-001')

      const result = await createSite(null, fd)
      expect(result.ok).toBe(true)

      const [client] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.companyId, TEST_COMPANY_ID), eq(clients.name, 'Integration Test Client')))
        .limit(1)

      expect(client.phone).toBe('555-0001')
      expect(client.email).toBe('integration@test.com')
      expect(client.accountType).toBe('Commercial')
      expect(client.accountNumber).toBe('ACC-001')
    })
  })

  it('creates a new client with partial fields (only phone)', async () => {
    await withRollback(async () => {
      const fd = new FormData()
      fd.set('name', 'Partial Phone Site')
      fd.set('client_name', 'Partial Phone Client')
      fd.set('client_phone', '555-2222')

      const result = await createSite(null, fd)
      expect(result.ok).toBe(true)

      const [client] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.companyId, TEST_COMPANY_ID), eq(clients.name, 'Partial Phone Client')))
        .limit(1)

      expect(client.phone).toBe('555-2222')
      expect(client.email).toBeNull()
      expect(client.accountType).toBeNull()
      expect(client.accountNumber).toBeNull()
    })
  })

  it('creates a new client with only email', async () => {
    await withRollback(async () => {
      const fd = new FormData()
      fd.set('name', 'Email Only Site')
      fd.set('client_name', 'Email Only Client')
      fd.set('client_email', 'emailonly@test.com')

      const result = await createSite(null, fd)
      expect(result.ok).toBe(true)

      const [client] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.companyId, TEST_COMPANY_ID), eq(clients.name, 'Email Only Client')))
        .limit(1)

      expect(client.phone).toBeNull()
      expect(client.email).toBe('emailonly@test.com')
    })
  })

  it('creates a new client with account type but no phone/email', async () => {
    await withRollback(async () => {
      const fd = new FormData()
      fd.set('name', 'Account Type Only Site')
      fd.set('client_name', 'Account Type Only Client')
      fd.set('client_account_type', 'Residential')

      const result = await createSite(null, fd)
      expect(result.ok).toBe(true)

      const [client] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.companyId, TEST_COMPANY_ID), eq(clients.name, 'Account Type Only Client')))
        .limit(1)

      expect(client.accountType).toBe('Residential')
      expect(client.phone).toBeNull()
      expect(client.email).toBeNull()
    })
  })

  it('links to existing client without overwriting their fields', async () => {
    await withRollback(async () => {
      // Pre-create a client with existing data
      const [existing] = await db
        .insert(clients)
        .values({
          companyId: TEST_COMPANY_ID,
          name: 'Pre-Existing Client',
          phone: '555-original',
          email: 'original@test.com',
          accountType: 'HOA',
          accountNumber: 'ORIG-123'
        })
        .returning()

      const fd = new FormData()
      fd.set('name', 'Linked Site')
      fd.set('client_name', 'Pre-Existing Client')
      // Try to override with new values
      fd.set('client_phone', '555-should-be-ignored')
      fd.set('client_email', 'should@be-ignored.com')

      const result = await createSite(null, fd)
      expect(result.ok).toBe(true)

      // Original client should have unchanged fields
      const [check] = await db.select().from(clients).where(eq(clients.id, existing.id)).limit(1)
      expect(check.phone).toBe('555-original')
      expect(check.email).toBe('original@test.com')
      expect(check.accountType).toBe('HOA')
      expect(check.accountNumber).toBe('ORIG-123')
    })
  })

  it('creates a site and links it to the newly created client', async () => {
    await withRollback(async () => {
      const fd = new FormData()
      fd.set('name', 'New Site with New Client')
      fd.set('client_name', 'Brand New Client')
      fd.set('client_phone', '555-5555')

      const result = await createSite(null, fd)
      expect(result.ok).toBe(true)
      expect(result.data.name).toBe('New Site with New Client')

      // Verify the site has the correct clientId
      const [site] = await db
        .select()
        .from(sites)
        .where(and(eq(sites.companyId, TEST_COMPANY_ID), eq(sites.name, 'New Site with New Client')))
        .limit(1)

      expect(site.clientId).toBeDefined()

      // Verify the client exists with the phone
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, site.clientId!))
        .limit(1)

      expect(client.name).toBe('Brand New Client')
      expect(client.phone).toBe('555-5555')
    })
  })

  it('creates a site linked to an existing client without touching client fields', async () => {
    await withRollback(async () => {
      // Pre-create a client
      const [existing] = await db
        .insert(clients)
        .values({ companyId: TEST_COMPANY_ID, name: 'Existing Client', phone: '555-existing' })
        .returning()

      const fd = new FormData()
      fd.set('name', 'Site Linked to Existing')
      fd.set('client_name', 'Existing Client')

      const result = await createSite(null, fd)
      expect(result.ok).toBe(true)

      const [site] = await db
        .select()
        .from(sites)
        .where(and(eq(sites.companyId, TEST_COMPANY_ID), eq(sites.name, 'Site Linked to Existing')))
        .limit(1)

      expect(site.clientId).toBe(existing.id)
    })
  })

  it('validates that all fields conform to schema (email must be valid if provided)', async () => {
    await withRollback(async () => {
      const fd = new FormData()
      fd.set('name', 'Email Validation Site')
      fd.set('client_name', 'Email Validation Client')
      fd.set('client_email', 'not-a-valid-email')

      const result = await createSite(null, fd)
      expect(result.ok).toBe(false)
      expect(result.error).toMatch(/email|invalid/i)
    })
  })

  it('handles empty string email as optional (not validation error)', async () => {
    await withRollback(async () => {
      const fd = new FormData()
      fd.set('name', 'Empty Email Site')
      fd.set('client_name', 'Empty Email Client')
      fd.set('client_email', '')

      const result = await createSite(null, fd)
      expect(result.ok).toBe(true)

      const [client] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.companyId, TEST_COMPANY_ID), eq(clients.name, 'Empty Email Client')))
        .limit(1)

      expect(client.email).toBeNull()
    })
  })

  it('requires site name even when creating a new client', async () => {
    await withRollback(async () => {
      const fd = new FormData()
      // No 'name' field
      fd.set('client_name', 'Some Client')
      fd.set('client_phone', '555-1234')

      const result = await createSite(null, fd)
      expect(result.ok).toBe(false)
      expect(result.error).toMatch(/name|required/i)
    })
  })

  it('creates a new client but site without address or notes', async () => {
    await withRollback(async () => {
      const fd = new FormData()
      fd.set('name', 'Site Without Details')
      fd.set('client_name', 'New Minimal Client')

      const result = await createSite(null, fd)
      expect(result.ok).toBe(true)

      const [site] = await db
        .select()
        .from(sites)
        .where(and(eq(sites.companyId, TEST_COMPANY_ID), eq(sites.name, 'Site Without Details')))
        .limit(1)

      expect(site.address).toBeNull()
      expect(site.notes).toBeNull()
    })
  })

  it('multi-tenant isolation: new client only visible within its company', async () => {
    // This test verifies that the new client fields don't break company isolation
    await withRollback(async () => {
      const fd = new FormData()
      fd.set('name', 'Isolation Test Site')
      fd.set('client_name', 'Isolation Test Client')
      fd.set('client_phone', '555-iso')

      const result = await createSite(null, fd)
      expect(result.ok).toBe(true)

      // Verify the client was created in TEST_COMPANY_ID
      const clients_in_test_company = await db
        .select()
        .from(clients)
        .where(and(eq(clients.companyId, TEST_COMPANY_ID), eq(clients.name, 'Isolation Test Client')))

      expect(clients_in_test_company.length).toBe(1)
      expect(clients_in_test_company[0].phone).toBe('555-iso')
    })
  })
})
