/**
 * Integration test for geocoding API caching.
 * Verifies that repeated geocode requests use cached results and don't hammer Nominatim.
 */

describe('/api/geocode', () => {
  let fetchCalls = 0

  beforeAll(() => {
    // Mock fetch to track API calls to Nominatim
    global.fetch = jest.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('nominatim.openstreetmap.org')) {
        fetchCalls++
      }

      // Return a mock Nominatim response
      return {
        ok: true,
        json: async () => ({
          address: {
            house_number: '123',
            road: 'Main St',
            city: 'Springfield',
            state: 'IL',
            postcode: '62701',
          },
        }),
      } as Response
    })
  })

  beforeEach(() => {
    fetchCalls = 0
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  test('geocode returns address for valid coordinates', async () => {
    const response = await fetch('/api/geocode?lat=39.7817&lon=-89.6501')
    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
    expect(typeof data[0]).toBe('string')
  })

  test('geocode caches results and does not call API twice for same coordinates', async () => {
    fetchCalls = 0

    // First call — should hit the API
    const res1 = await fetch('/api/geocode?lat=40.7128&lon=-74.0060')
    const data1 = await res1.json()
    const initialFetchCalls = fetchCalls

    expect(initialFetchCalls).toBeGreaterThan(0)
    expect(Array.isArray(data1)).toBe(true)

    // Second call with same coordinates — should use cache
    fetchCalls = 0
    const res2 = await fetch('/api/geocode?lat=40.7128&lon=-74.0060')
    const data2 = await res2.json()

    // Results should be identical
    expect(data2).toEqual(data1)

    // No additional fetch calls should be made (cache hit)
    expect(fetchCalls).toBe(0)
  })

  test('geocode returns error for missing lat/lon', async () => {
    const response = await fetch('/api/geocode?lat=40.7128')
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBeDefined()
  })

  test('geocode formats addresses correctly', async () => {
    const response = await fetch('/api/geocode?lat=51.5074&lon=-0.1278')
    expect(response.ok).toBe(true)

    const data = await response.json()
    // Addresses should be formatted strings, not objects
    expect(data.every((addr: any) => typeof addr === 'string')).toBe(true)
  })
})
