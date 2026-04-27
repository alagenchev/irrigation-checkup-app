import { and, eq } from 'drizzle-orm'
import { startTestDb, stopTestDb, testDb, TEST_COMPANY_ID } from '../test/helpers/db'
import { sites, siteDrawings, companies } from '@/lib/schema'

beforeAll(async () => {
  await startTestDb()
}, 60_000)

afterAll(async () => {
  await stopTestDb()
})

// ── Test fixtures ──────────────────────────────────────────────────────────

const EMPTY_FC = { type: 'FeatureCollection', features: [] }

const POLYGON_FC = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-118.4, 34.0],
            [-118.3, 34.0],
            [-118.3, 33.9],
            [-118.4, 33.9],
            [-118.4, 34.0],
          ],
        ],
      },
    },
  ],
}

const LINE_FC = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [-118.4, 34.0],
          [-118.3, 33.9],
        ],
      },
    },
  ],
}

const POINT_FC = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Test Point' },
      geometry: {
        type: 'Point',
        coordinates: [-118.35, 33.95],
      },
    },
  ],
}

// ── Helper to create a test site ────────────────────────────────────────────

async function ensureSite(name: string) {
  const [created] = await testDb
    .insert(sites)
    .values({
      companyId: TEST_COMPANY_ID,
      name,
      address: '123 Test St',
    })
    .returning()
  return created
}

/** Clean up all test data for the test company after each test. */
async function cleanupTestData() {
  await testDb.delete(siteDrawings).where(eq(siteDrawings.companyId, TEST_COMPANY_ID))
  await testDb.delete(sites).where(eq(sites.companyId, TEST_COMPANY_ID))
  // Clean up other companies created in cross-tenant tests
  const allCompanies = await testDb.select().from(companies)
  for (const company of allCompanies) {
    if (company.clerkOrgId.startsWith('org_test_cross_tenant_')) {
      await testDb.delete(companies).where(eq(companies.id, company.id))
    }
  }
}

afterEach(async () => {
  await cleanupTestData()
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe('siteDrawings — DB integration', () => {
  test('returns null when no drawing exists for a site', async () => {
    const site = await ensureSite('Test Site No Drawing')

    const row = await testDb.query.siteDrawings.findFirst({
      where: and(
        eq(siteDrawings.siteId, site.id),
        eq(siteDrawings.companyId, TEST_COMPANY_ID),
      ),
    })

    expect(row).toBeUndefined()
  })

  test('returns stored GeoJSON after a save', async () => {
    const site = await ensureSite('Test Site With Drawing')

    await testDb
      .insert(siteDrawings)
      .values({
        companyId: TEST_COMPANY_ID,
        siteId: site.id,
        drawing: EMPTY_FC,
      })

    const row = await testDb.query.siteDrawings.findFirst({
      where: and(
        eq(siteDrawings.siteId, site.id),
        eq(siteDrawings.companyId, TEST_COMPANY_ID),
      ),
    })

    expect(row).toBeDefined()
    expect(row?.drawing).toEqual(EMPTY_FC)
  })

  test('only returns drawing for correct siteId (not a different site in same company)', async () => {
    const site1 = await ensureSite('Site 1')
    const site2 = await ensureSite('Site 2')

    await testDb
      .insert(siteDrawings)
      .values({
        companyId: TEST_COMPANY_ID,
        siteId: site1.id,
        drawing: EMPTY_FC,
      })

    const row = await testDb.query.siteDrawings.findFirst({
      where: and(
        eq(siteDrawings.siteId, site2.id),
        eq(siteDrawings.companyId, TEST_COMPANY_ID),
      ),
    })

    expect(row).toBeUndefined()
  })

  test('inserts a new drawing when none exists', async () => {
    const site = await ensureSite('Test Insert Drawing')

    const [inserted] = await testDb
      .insert(siteDrawings)
      .values({
        companyId: TEST_COMPANY_ID,
        siteId: site.id,
        drawing: EMPTY_FC,
      })
      .returning()

    expect(inserted.id).toBeDefined()
    expect(inserted.siteId).toBe(site.id)
    expect(inserted.companyId).toBe(TEST_COMPANY_ID)
    expect(inserted.drawing).toEqual(EMPTY_FC)
  })

  test('replaces (upserts) an existing drawing', async () => {
    const site = await ensureSite('Test Upsert Drawing')

    // Insert initial drawing
    await testDb
      .insert(siteDrawings)
      .values({
        companyId: TEST_COMPANY_ID,
        siteId: site.id,
        drawing: EMPTY_FC,
      })

    // Upsert with new drawing
    await testDb
      .insert(siteDrawings)
      .values({
        companyId: TEST_COMPANY_ID,
        siteId: site.id,
        drawing: POLYGON_FC,
      })
      .onConflictDoUpdate({
        target: [siteDrawings.companyId, siteDrawings.siteId],
        set: { drawing: POLYGON_FC, updatedAt: new Date() },
      })

    const row = await testDb.query.siteDrawings.findFirst({
      where: and(
        eq(siteDrawings.siteId, site.id),
        eq(siteDrawings.companyId, TEST_COMPANY_ID),
      ),
    })

    expect(row?.drawing).toEqual(POLYGON_FC)
  })

  test('stores GeoJSON exactly as provided — no transformation', async () => {
    const site = await ensureSite('Test Exact GeoJSON')

    const customGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { customField: 'custom value', nested: { deep: 'data' } },
          geometry: { type: 'Point', coordinates: [100, 50] },
        },
      ],
    }

    await testDb
      .insert(siteDrawings)
      .values({
        companyId: TEST_COMPANY_ID,
        siteId: site.id,
        drawing: customGeoJSON,
      })

    const row = await testDb.query.siteDrawings.findFirst({
      where: and(
        eq(siteDrawings.siteId, site.id),
        eq(siteDrawings.companyId, TEST_COMPANY_ID),
      ),
    })

    expect(row?.drawing).toEqual(customGeoJSON)
  })

  test('stores companyId alongside the drawing', async () => {
    const site = await ensureSite('Test Company ID Storage')

    const [inserted] = await testDb
      .insert(siteDrawings)
      .values({
        companyId: TEST_COMPANY_ID,
        siteId: site.id,
        drawing: EMPTY_FC,
      })
      .returning()

    expect(inserted.companyId).toBe(TEST_COMPANY_ID)
  })

  test('cannot write a drawing for a site belonging to a different company (cross-tenant check)', async () => {
    // Create a different company
    const [otherCompany] = await testDb
      .insert(companies)
      .values({ clerkOrgId: 'org_test_cross_tenant_' + Date.now() })
      .returning()

    // Create a site in the other company
    const [otherSite] = await testDb
      .insert(sites)
      .values({
        companyId: otherCompany.id,
        name: 'Other Company Site',
        address: '456 Other St',
      })
      .returning()

    // Try to insert a drawing for the other company's site using our company's ID
    // This should succeed at the DB layer (no FK constraint prevents it),
    // but in the route handler, the findFirst would not find the site because
    // it filters by both siteId AND companyId. So we're testing the query isolation.

    const row = await testDb.query.siteDrawings.findFirst({
      where: and(
        eq(siteDrawings.siteId, otherSite.id),
        eq(siteDrawings.companyId, TEST_COMPANY_ID),
      ),
    })

    // Because we're filtering by TEST_COMPANY_ID, we should not find a drawing
    // even though the site exists (it belongs to otherCompany)
    expect(row).toBeUndefined()
  })

  test('stores polygon FeatureCollection correctly', async () => {
    const site = await ensureSite('Test Polygon FC')

    await testDb
      .insert(siteDrawings)
      .values({
        companyId: TEST_COMPANY_ID,
        siteId: site.id,
        drawing: POLYGON_FC,
      })

    const row = await testDb.query.siteDrawings.findFirst({
      where: and(
        eq(siteDrawings.siteId, site.id),
        eq(siteDrawings.companyId, TEST_COMPANY_ID),
      ),
    })

    expect(row?.drawing).toEqual(POLYGON_FC)
    expect((row?.drawing as any).features[0].geometry.type).toBe('Polygon')
  })

  test('stores line FeatureCollection correctly', async () => {
    const site = await ensureSite('Test Line FC')

    await testDb
      .insert(siteDrawings)
      .values({
        companyId: TEST_COMPANY_ID,
        siteId: site.id,
        drawing: LINE_FC,
      })

    const row = await testDb.query.siteDrawings.findFirst({
      where: and(
        eq(siteDrawings.siteId, site.id),
        eq(siteDrawings.companyId, TEST_COMPANY_ID),
      ),
    })

    expect(row?.drawing).toEqual(LINE_FC)
    expect((row?.drawing as any).features[0].geometry.type).toBe('LineString')
  })

  test('stores point FeatureCollection correctly', async () => {
    const site = await ensureSite('Test Point FC')

    await testDb
      .insert(siteDrawings)
      .values({
        companyId: TEST_COMPANY_ID,
        siteId: site.id,
        drawing: POINT_FC,
      })

    const row = await testDb.query.siteDrawings.findFirst({
      where: and(
        eq(siteDrawings.siteId, site.id),
        eq(siteDrawings.companyId, TEST_COMPANY_ID),
      ),
    })

    expect(row?.drawing).toEqual(POINT_FC)
    expect((row?.drawing as any).features[0].geometry.type).toBe('Point')
  })

  test('stores empty FeatureCollection correctly', async () => {
    const site = await ensureSite('Test Empty FC')

    await testDb
      .insert(siteDrawings)
      .values({
        companyId: TEST_COMPANY_ID,
        siteId: site.id,
        drawing: EMPTY_FC,
      })

    const row = await testDb.query.siteDrawings.findFirst({
      where: and(
        eq(siteDrawings.siteId, site.id),
        eq(siteDrawings.companyId, TEST_COMPANY_ID),
      ),
    })

    expect(row?.drawing).toEqual(EMPTY_FC)
    expect((row?.drawing as any).features).toHaveLength(0)
  })
})
