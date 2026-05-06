/**
 * Unit tests for actions/site-maps.ts
 *
 * Covers: getSiteMap, getSiteMaps, createSiteMap, saveSiteMapDrawing,
 *         deleteSiteMap, duplicateSiteMap
 */

jest.mock('server-only', () => ({}), { virtual: true })

jest.mock('@/lib/tenant', () => ({
  getRequiredCompanyId: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  db: {
    query: {
      siteMaps: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    },
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}))

import { getRequiredCompanyId } from '@/lib/tenant'
import { db } from '@/lib/db'
import {
  getSiteMap,
  getSiteMaps,
  createSiteMap,
  saveSiteMapDrawing,
  deleteSiteMap,
  duplicateSiteMap,
} from '@/actions/site-maps'

const mockGetCompanyId = getRequiredCompanyId as jest.Mock
const mockDb = db as jest.Mocked<typeof db>

const COMPANY = 'company-1'
const MAP_ID = 'map-abc'
const SITE_ID = 'site-xyz'

const SAMPLE_MAP = {
  id: MAP_ID,
  siteId: SITE_ID,
  companyId: COMPANY,
  name: 'Main Map',
  drawing: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetCompanyId.mockResolvedValue(COMPANY)
})

// ---------------------------------------------------------------------------
// getSiteMap
// ---------------------------------------------------------------------------

describe('getSiteMap', () => {
  test('returns the map when found', async () => {
    mockDb.query.siteMaps.findFirst.mockResolvedValueOnce(SAMPLE_MAP)

    const result = await getSiteMap(MAP_ID)

    expect(result).toEqual(SAMPLE_MAP)
    expect(mockDb.query.siteMaps.findFirst).toHaveBeenCalledTimes(1)
  })

  test('returns undefined when map not found', async () => {
    mockDb.query.siteMaps.findFirst.mockResolvedValueOnce(undefined)

    const result = await getSiteMap('nonexistent')

    expect(result).toBeUndefined()
  })

  test('calls getRequiredCompanyId to enforce tenant isolation', async () => {
    mockDb.query.siteMaps.findFirst.mockResolvedValueOnce(SAMPLE_MAP)

    await getSiteMap(MAP_ID)

    expect(mockGetCompanyId).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// getSiteMaps
// ---------------------------------------------------------------------------

describe('getSiteMaps', () => {
  test('returns list of maps for site', async () => {
    mockDb.query.siteMaps.findMany.mockResolvedValueOnce([SAMPLE_MAP])

    const result = await getSiteMaps(SITE_ID)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(SAMPLE_MAP)
  })

  test('returns empty array when no maps exist', async () => {
    mockDb.query.siteMaps.findMany.mockResolvedValueOnce([])

    const result = await getSiteMaps(SITE_ID)

    expect(result).toEqual([])
  })

  test('calls getRequiredCompanyId to enforce tenant isolation', async () => {
    mockDb.query.siteMaps.findMany.mockResolvedValueOnce([])

    await getSiteMaps(SITE_ID)

    expect(mockGetCompanyId).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// createSiteMap
// ---------------------------------------------------------------------------

describe('createSiteMap', () => {
  test('inserts a new map and returns it', async () => {
    const newMap = { ...SAMPLE_MAP, name: 'New Map' }
    const mockReturning = jest.fn().mockResolvedValueOnce([newMap])
    const mockValues = jest.fn().mockReturnValueOnce({ returning: mockReturning })
    mockDb.insert.mockReturnValueOnce({ values: mockValues } as any)

    const result = await createSiteMap(SITE_ID, 'New Map')

    expect(result).toEqual(newMap)
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: SITE_ID, companyId: COMPANY, name: 'New Map' })
    )
  })

  test('calls getRequiredCompanyId to enforce tenant isolation', async () => {
    const mockReturning = jest.fn().mockResolvedValueOnce([SAMPLE_MAP])
    const mockValues = jest.fn().mockReturnValueOnce({ returning: mockReturning })
    mockDb.insert.mockReturnValueOnce({ values: mockValues } as any)

    await createSiteMap(SITE_ID, 'Test')

    expect(mockGetCompanyId).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// saveSiteMapDrawing
// ---------------------------------------------------------------------------

describe('saveSiteMapDrawing', () => {
  const DRAWING = { type: 'FeatureCollection', features: [] }

  function mockUpdateChain() {
    const mockWhere = jest.fn().mockResolvedValueOnce(undefined)
    const mockSet = jest.fn().mockReturnValueOnce({ where: mockWhere })
    mockDb.update.mockReturnValueOnce({ set: mockSet } as any)
    return { mockSet, mockWhere }
  }

  test('calls update with drawing and updatedAt', async () => {
    const { mockSet } = mockUpdateChain()

    await saveSiteMapDrawing(MAP_ID, DRAWING)

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ drawing: DRAWING, updatedAt: expect.any(Date) })
    )
  })

  test('filters by mapId and companyId', async () => {
    const { mockWhere } = mockUpdateChain()

    await saveSiteMapDrawing(MAP_ID, DRAWING)

    expect(mockWhere).toHaveBeenCalledTimes(1)
  })

  test('calls getRequiredCompanyId to enforce tenant isolation', async () => {
    mockUpdateChain()

    await saveSiteMapDrawing(MAP_ID, DRAWING)

    expect(mockGetCompanyId).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// deleteSiteMap
// ---------------------------------------------------------------------------

describe('deleteSiteMap', () => {
  function mockDeleteChain() {
    const mockWhere = jest.fn().mockResolvedValueOnce(undefined)
    mockDb.delete.mockReturnValueOnce({ where: mockWhere } as any)
    return { mockWhere }
  }

  test('calls delete with correct mapId', async () => {
    const { mockWhere } = mockDeleteChain()

    await deleteSiteMap(MAP_ID)

    expect(mockWhere).toHaveBeenCalledTimes(1)
    expect(mockDb.delete).toHaveBeenCalledTimes(1)
  })

  test('calls getRequiredCompanyId to enforce tenant isolation', async () => {
    mockDeleteChain()

    await deleteSiteMap(MAP_ID)

    expect(mockGetCompanyId).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// duplicateSiteMap
// ---------------------------------------------------------------------------

describe('duplicateSiteMap', () => {
  test('throws when original map not found', async () => {
    mockDb.query.siteMaps.findFirst.mockResolvedValueOnce(undefined)

    await expect(duplicateSiteMap(MAP_ID, 'Copy')).rejects.toThrow('Map not found')
  })

  test('inserts a copy with new name and returns it', async () => {
    mockDb.query.siteMaps.findFirst.mockResolvedValueOnce(SAMPLE_MAP)

    const copy = { ...SAMPLE_MAP, id: 'map-copy', name: 'Main Map (copy)' }
    const mockReturning = jest.fn().mockResolvedValueOnce([copy])
    const mockValues = jest.fn().mockReturnValueOnce({ returning: mockReturning })
    mockDb.insert.mockReturnValueOnce({ values: mockValues } as any)

    const result = await duplicateSiteMap(MAP_ID, 'Main Map (copy)')

    expect(result).toEqual(copy)
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: SAMPLE_MAP.siteId,
        companyId: COMPANY,
        name: 'Main Map (copy)',
      })
    )
  })

  test('copies the drawing from original', async () => {
    const mapWithDrawing = { ...SAMPLE_MAP, drawing: { type: 'FeatureCollection', features: [] } }
    mockDb.query.siteMaps.findFirst.mockResolvedValueOnce(mapWithDrawing)

    const mockReturning = jest.fn().mockResolvedValueOnce([mapWithDrawing])
    const mockValues = jest.fn().mockReturnValueOnce({ returning: mockReturning })
    mockDb.insert.mockReturnValueOnce({ values: mockValues } as any)

    await duplicateSiteMap(MAP_ID, 'Copy')

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ drawing: mapWithDrawing.drawing })
    )
  })

  test('calls getRequiredCompanyId to enforce tenant isolation', async () => {
    mockDb.query.siteMaps.findFirst.mockResolvedValueOnce(undefined)

    await expect(duplicateSiteMap(MAP_ID, 'Copy')).rejects.toThrow()

    expect(mockGetCompanyId).toHaveBeenCalledTimes(1)
  })
})
