import { generateIrrigationPdfHtml } from '@/lib/irrigation-pdf'

function makeData(overrides: Record<string, unknown> = {}) {
  return {
    formData: {
      clientName: 'Acme Corp',
      siteName: 'Headquarters',
      clientAddress: '1 Client Rd',
      siteAddress: '2 Site Ave',
      inspectorName: 'Jane Smith',
      inspectorLicenseNum: 'LIC-99',
      companyName: 'GreenTech Irrigation',
      companyAddress: '3 Company Blvd',
      companyCityStateZip: 'Springfield, CA 90000',
      companyPhone: '555-0100',
      inspectionNotes: '',
      staticPressure: '65',
      backflowInstalled: 'true',
      backflowServiceable: 'true',
      isolationValve: 'false',
      systemNotes: '',
      datePerformed: '2026-05-06',
      inspectionType: 'Start-up',
      accountNumber: 'ACC-007',
    },
    controllers: [],
    zones: [],
    backflows: [],
    zoneIssues: [],
    quoteItems: [],
    photoMap: {},
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Client info table — inspection fields
// ---------------------------------------------------------------------------

describe('client info table', () => {
  test('renders datePerformed in client table', () => {
    const html = generateIrrigationPdfHtml(makeData() as any)
    expect(html).toContain('2026-05-06')
  })

  test('renders inspectionType in client table', () => {
    const html = generateIrrigationPdfHtml(makeData() as any)
    expect(html).toContain('Start-up')
  })

  test('renders accountNumber in client table', () => {
    const html = generateIrrigationPdfHtml(makeData() as any)
    expect(html).toContain('ACC-007')
  })

  test('renders Date label', () => {
    const html = generateIrrigationPdfHtml(makeData() as any)
    expect(html).toMatch(/Date:/)
  })

  test('renders Insp. Type label', () => {
    const html = generateIrrigationPdfHtml(makeData() as any)
    expect(html).toMatch(/Insp\. Type:/)
  })
})

// ---------------------------------------------------------------------------
// Backflow numbering
// ---------------------------------------------------------------------------

describe('backflow numbering', () => {
  test('numbers backflows 1, 2 by position not by id', () => {
    const data = makeData({
      backflows: [
        { id: 42, manufacturer: 'Watts', type: 'RPZ', model: 'LF007', size: '1"' },
        { id: 99, manufacturer: 'Febco', type: 'PVB', model: '765', size: '3/4"' },
      ],
    })
    const html = generateIrrigationPdfHtml(data as any)
    // Should use position-based numbering (#1, #2), not ephemeral ids (#42, #99)
    expect(html).toContain('#1')
    expect(html).toContain('#2')
    expect(html).not.toContain('#42')
    expect(html).not.toContain('#99')
  })

  test('single backflow is numbered #1 regardless of id', () => {
    const data = makeData({
      backflows: [{ id: 7, manufacturer: 'Watts', type: 'DC', model: 'XL', size: '2"' }],
    })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).toContain('#1')
    expect(html).not.toContain('#7')
  })
})

// ---------------------------------------------------------------------------
// Zones grouped under their controller
// ---------------------------------------------------------------------------

describe('zone-controller grouping', () => {
  const CONTROLLER = { id: 10, location: 'Front', manufacturer: 'Rain Bird', model: 'ESP', sensors: 'None', numZones: '2', masterValve: false, notes: '' }
  const ZONE_A = { id: 20, zoneNum: '1', controller: '10', description: 'Lawn', landscapeTypes: ['Turf'], irrigationTypes: ['Rotor'], notes: '' }
  const ZONE_B = { id: 21, zoneNum: '2', controller: '10', description: 'Beds', landscapeTypes: ['Bed'], irrigationTypes: ['Drip'], notes: '' }

  test('zones appear under their assigned controller', () => {
    const data = makeData({ controllers: [CONTROLLER], zones: [ZONE_A, ZONE_B] })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).toContain('Front')   // controller location
    expect(html).toContain('Lawn')    // zone A description
    expect(html).toContain('Beds')    // zone B description
  })

  test('does not render Unassigned Zones section when all zones have a controller', () => {
    const data = makeData({ controllers: [CONTROLLER], zones: [ZONE_A, ZONE_B] })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).not.toContain('Unassigned Zones')
  })
})

// ---------------------------------------------------------------------------
// Orphaned zones (no controller assignment)
// ---------------------------------------------------------------------------

describe('unassigned (orphaned) zones', () => {
  const ORPHAN = { id: 5, zoneNum: '3', controller: '', description: 'Side yard', landscapeTypes: [], irrigationTypes: [], notes: '' }

  test('orphaned zone description appears in Unassigned Zones section', () => {
    const data = makeData({ controllers: [], zones: [ORPHAN] })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).toContain('Unassigned Zones')
    expect(html).toContain('Side yard')
  })

  test('zone number and controller appear in issues table for orphaned zone', () => {
    const data = makeData({
      controllers: [],
      zones: [ORPHAN],
      zoneIssues: [{ zoneNum: '3', issues: ['Runoff'] }],
    })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).toContain('issues-summary-table')
    expect(html).toContain('Unassigned')
    expect(html).toContain('Runoff')
  })

  test('orphaned zone with issue appears in combined issues table', () => {
    const data = makeData({
      controllers: [],
      zones: [ORPHAN],
      zoneIssues: [{ zoneNum: '3', issues: ['Runoff'] }],
    })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).toContain('issues-summary-table')
    expect(html).toContain('Runoff')
  })

  test('zone assigned to a non-existent controller is treated as orphaned', () => {
    const DANGLING = { id: 6, zoneNum: '4', controller: '999', description: 'Back', landscapeTypes: [], irrigationTypes: [], notes: '' }
    const data = makeData({ controllers: [], zones: [DANGLING] })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).toContain('Unassigned Zones')
    expect(html).toContain('Back')
  })

  test('orphaned zones do not appear when controller exists for all zones', () => {
    const CTRL = { id: 1, location: 'Main', manufacturer: '', model: '', sensors: '', numZones: '1', masterValve: false, notes: '' }
    const ZONE = { id: 2, zoneNum: '1', controller: '1', description: 'Front', landscapeTypes: [], irrigationTypes: [], notes: '' }
    const data = makeData({ controllers: [CTRL], zones: [ZONE] })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).not.toContain('Unassigned Zones')
  })
})

// ---------------------------------------------------------------------------
// Zone issues checkmarks
// ---------------------------------------------------------------------------

describe('zone issues', () => {
  const CTRL = { id: 1, location: 'Main', manufacturer: '', model: '', sensors: '', numZones: '1', masterValve: false, notes: '' }
  const ZONE = { id: 2, zoneNum: '1', controller: '1', description: 'Lawn', landscapeTypes: [], irrigationTypes: [], notes: '' }

  test('zone with issue appears in issues table with controller name', () => {
    const data = makeData({
      controllers: [CTRL],
      zones: [ZONE],
      zoneIssues: [{ zoneNum: '1', issues: ['Runoff'] }],
    })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).toContain('issues-summary-table')
    expect(html).toContain('Main')
    expect(html).toContain('Runoff')
  })

  test('zone with no issues does not appear in issues table', () => {
    const data = makeData({
      controllers: [CTRL],
      zones: [ZONE],
      zoneIssues: [{ zoneNum: '1', issues: [] }],
    })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).not.toContain('class="issues-summary-table"')
  })
})

// ---------------------------------------------------------------------------
// Issues section — unified, sorted, correct heading
// ---------------------------------------------------------------------------

describe('issues section structure', () => {
  const CTRL_A = { id: 1, location: 'Front', manufacturer: '', model: '', sensors: '', numZones: '2', masterValve: false, notes: '' }
  const CTRL_B = { id: 2, location: 'Back',  manufacturer: '', model: '', sensors: '', numZones: '1', masterValve: false, notes: '' }
  const ZONE_1 = { id: 10, zoneNum: '1', controller: '1', description: 'Lawn',  landscapeTypes: [], irrigationTypes: [], notes: '' }
  const ZONE_2 = { id: 11, zoneNum: '2', controller: '2', description: 'Beds',  landscapeTypes: [], irrigationTypes: [], notes: '' }
  const ZONE_3 = { id: 12, zoneNum: '3', controller: '1', description: 'Trees', landscapeTypes: [], irrigationTypes: [], notes: '' }

  test('issues section heading is "Issues" not per-controller heading', () => {
    const data = makeData({
      controllers: [CTRL_A],
      zones: [ZONE_1],
      zoneIssues: [{ zoneNum: '1', issues: ['Runoff'] }],
    })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).toContain('>Issues<')
    expect(html).not.toContain('Zone Issues:')
  })

  test('zones from different controllers appear in one combined issues table', () => {
    const data = makeData({
      controllers: [CTRL_A, CTRL_B],
      zones: [ZONE_1, ZONE_2],
      zoneIssues: [
        { zoneNum: '1', issues: ['Runoff'] },
        { zoneNum: '2', issues: ['Overspray'] },
      ],
    })
    const html = generateIrrigationPdfHtml(data as any)
    // Only one issues table, not one per controller
    const tableCount = (html.match(/class="issues-summary-table"/g) || []).length
    expect(tableCount).toBe(1)
    expect(html).toContain('Runoff')
    expect(html).toContain('Overspray')
    expect(html).toContain('Front')
    expect(html).toContain('Back')
  })

  test('zones are sorted numerically by zone number in the issues table', () => {
    const ZONE_10 = { id: 13, zoneNum: '10', controller: '1', description: 'D', landscapeTypes: [], irrigationTypes: [], notes: '' }
    const data = makeData({
      controllers: [CTRL_A],
      zones: [ZONE_10, ZONE_3, ZONE_1],
      zoneIssues: [
        { zoneNum: '10', issues: ['Runoff'] },
        { zoneNum: '3',  issues: ['Overspray'] },
        { zoneNum: '1',  issues: ['Runoff'] },
      ],
    })
    const html = generateIrrigationPdfHtml(data as any)
    const pos1  = html.indexOf('zone-cell">1<')
    const pos3  = html.indexOf('zone-cell">3<')
    const pos10 = html.indexOf('zone-cell">10<')
    expect(pos1).toBeLessThan(pos3)
    expect(pos3).toBeLessThan(pos10)
  })

  test('multiple issues for a zone are comma-separated in the issues column', () => {
    const data = makeData({
      controllers: [CTRL_A],
      zones: [ZONE_1],
      zoneIssues: [{ zoneNum: '1', issues: ['Runoff', 'Overspray', 'Lower Head'] }],
    })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).toContain('Runoff, Overspray, Lower Head')
  })

  test('zone with no issues is excluded from the issues table', () => {
    const data = makeData({
      controllers: [CTRL_A],
      zones: [ZONE_1, ZONE_3],
      zoneIssues: [
        { zoneNum: '1', issues: ['Runoff'] },
        { zoneNum: '3', issues: [] },
      ],
    })
    const html = generateIrrigationPdfHtml(data as any)
    // Zone 3 has no issues — should not appear as a row in the issues table
    // The zone-cell for zone 3 should not be present (zone 1 will be)
    expect(html).toContain('zone-cell">1<')
    expect(html).not.toContain('zone-cell">3<')
  })

  test('issues section is omitted entirely when no zones have issues', () => {
    const data = makeData({
      controllers: [CTRL_A],
      zones: [ZONE_1],
      zoneIssues: [],
    })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).not.toContain('class="issues-summary-table"')
  })
})

// ---------------------------------------------------------------------------
// Page breaks — conditional on photos
// ---------------------------------------------------------------------------

describe('page breaks', () => {
  test('no photos produces exactly one page-break (before quote)', () => {
    const html = generateIrrigationPdfHtml(makeData() as any)
    const breaks = (html.match(/class="page-break"/g) || []).length
    expect(breaks).toBe(1)
  })

  test('with photos produces two page-breaks (before photos + before quote)', () => {
    const data = makeData({
      photoMap: { photo_zone_1: ['data:image/png;base64,abc'] },
    })
    const html = generateIrrigationPdfHtml(data as any)
    const breaks = (html.match(/class="page-break"/g) || []).length
    expect(breaks).toBe(2)
  })

  test('photos section is present when photoMap has entries', () => {
    const data = makeData({
      photoMap: { photo_zone_1: ['data:image/png;base64,abc'] },
    })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).toContain('Zone Photos')
  })

  test('photos section is absent when photoMap is empty', () => {
    const html = generateIrrigationPdfHtml(makeData() as any)
    expect(html).not.toContain('Zone Photos')
  })
})

// ---------------------------------------------------------------------------
// Quote total
// ---------------------------------------------------------------------------

describe('quote total', () => {
  test('computes total as sum of price * qty', () => {
    const data = makeData({
      quoteItems: [
        { num: 1, location: 'C1-Z1', item: 'Head', description: '', price: 25, qty: 3 },
        { num: 2, location: 'C1-Z2', item: 'Valve', description: '', price: 80, qty: 1 },
      ],
    })
    const html = generateIrrigationPdfHtml(data as any)
    // 25*3 + 80*1 = 155
    expect(html).toContain('$155.00')
  })

  test('shows $0.00 when no quote items', () => {
    const html = generateIrrigationPdfHtml(makeData() as any)
    expect(html).toContain('$0.00')
  })
})
