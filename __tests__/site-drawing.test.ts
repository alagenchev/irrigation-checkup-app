import { POST } from '@/app/api/sites/[siteId]/drawing/route'

// Mock server-only (Next.js security module)
jest.mock('server-only', () => ({}), { virtual: true })

// Mock tenant utilities
jest.mock('@/lib/tenant', () => ({
  getRequiredCompanyId: jest.fn(),
}))

// Mock DB module
jest.mock('@/lib/db', () => ({
  db: {
    query: {
      sites: {
        findFirst: jest.fn(),
      },
      siteDrawings: {
        findFirst: jest.fn(),
      },
    },
    insert: jest.fn(),
  },
}))

import { getRequiredCompanyId } from '@/lib/tenant'
import { db } from '@/lib/db'

const mockGetRequiredCompanyId = getRequiredCompanyId as jest.Mock
const mockDb = db as jest.Mocked<typeof db>

describe('POST /api/sites/[siteId]/drawing — request validation', () => {
  const VALID_FC = {
    type: 'FeatureCollection',
    features: [],
  }

  const TEST_COMPANY_ID = 'test-company-id'
  const TEST_SITE_ID = 'test-site-id'

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetRequiredCompanyId.mockResolvedValue(TEST_COMPANY_ID)
  })

  test('rejects non-object body with 400', async () => {
    mockDb.query.sites.findFirst.mockResolvedValueOnce({ id: TEST_SITE_ID })

    const req = new Request('http://localhost/api/sites/test-site-id/drawing', {
      method: 'POST',
      body: '"just a string"',
    })

    const response = await POST(req, {
      params: Promise.resolve({ siteId: TEST_SITE_ID }),
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Expected a GeoJSON FeatureCollection')
  })

  test('rejects GeoJSON type that is NOT FeatureCollection with 400', async () => {
    mockDb.query.sites.findFirst.mockResolvedValueOnce({ id: TEST_SITE_ID })

    const req = new Request('http://localhost/api/sites/test-site-id/drawing', {
      method: 'POST',
      body: JSON.stringify({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [0, 0] },
      }),
    })

    const response = await POST(req, {
      params: Promise.resolve({ siteId: TEST_SITE_ID }),
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Expected a GeoJSON FeatureCollection')
  })

  test('rejects null body with 400', async () => {
    mockDb.query.sites.findFirst.mockResolvedValueOnce({ id: TEST_SITE_ID })

    const req = new Request('http://localhost/api/sites/test-site-id/drawing', {
      method: 'POST',
      body: 'null',
    })

    const response = await POST(req, {
      params: Promise.resolve({ siteId: TEST_SITE_ID }),
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Expected a GeoJSON FeatureCollection')
  })

  test('rejects malformed JSON with 400', async () => {
    mockDb.query.sites.findFirst.mockResolvedValueOnce({ id: TEST_SITE_ID })

    const req = new Request('http://localhost/api/sites/test-site-id/drawing', {
      method: 'POST',
      body: '{invalid json}',
    })

    const response = await POST(req, {
      params: Promise.resolve({ siteId: TEST_SITE_ID }),
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invalid JSON')
  })

  test('accepts valid FeatureCollection and proceeds to upsert', async () => {
    mockDb.query.sites.findFirst.mockResolvedValueOnce({ id: TEST_SITE_ID })

    // Mock the insert().values().onConflictDoUpdate() chain
    const mockReturning = jest.fn().mockResolvedValueOnce([])
    const mockOnConflictDoUpdate = jest.fn().mockReturnValueOnce({ returning: mockReturning })
    const mockValues = jest.fn().mockReturnValueOnce({ onConflictDoUpdate: mockOnConflictDoUpdate })
    mockDb.insert.mockReturnValueOnce({ values: mockValues } as any)

    const req = new Request('http://localhost/api/sites/test-site-id/drawing', {
      method: 'POST',
      body: JSON.stringify(VALID_FC),
    })

    const response = await POST(req, {
      params: Promise.resolve({ siteId: TEST_SITE_ID }),
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ok).toBe(true)

    // Verify the insert was called with correct values
    expect(mockValues).toHaveBeenCalledWith({
      companyId: TEST_COMPANY_ID,
      siteId: TEST_SITE_ID,
      drawing: VALID_FC,
    })

    // Verify the onConflictDoUpdate was called with correct target and set
    const callArgs = mockOnConflictDoUpdate.mock.calls[0][0]
    expect(callArgs.set.drawing).toEqual(VALID_FC)
  })

  test('returns 404 when site does not exist', async () => {
    mockDb.query.sites.findFirst.mockResolvedValueOnce(null)

    const req = new Request('http://localhost/api/sites/test-site-id/drawing', {
      method: 'POST',
      body: JSON.stringify(VALID_FC),
    })

    const response = await POST(req, {
      params: Promise.resolve({ siteId: TEST_SITE_ID }),
    })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Not found')
  })

  test('returns 404 when site belongs to different company', async () => {
    mockDb.query.sites.findFirst.mockResolvedValueOnce(null)

    const req = new Request('http://localhost/api/sites/test-site-id/drawing', {
      method: 'POST',
      body: JSON.stringify(VALID_FC),
    })

    const response = await POST(req, {
      params: Promise.resolve({ siteId: TEST_SITE_ID }),
    })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Not found')
  })
})
