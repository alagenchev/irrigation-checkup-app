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

  test('zone number appears in orphan zone issues table', () => {
    const data = makeData({
      controllers: [],
      zones: [ORPHAN],
      zoneIssues: [{ zoneNum: '3', issues: ['Runoff'] }],
    })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).toContain('Zone Issues: Unassigned Zones')
    // Zone 3 row should be present
    expect(html).toMatch(/zone-num[^>]*>3</)
  })

  test('orphaned zone with issue shows checkmark in issues table', () => {
    const data = makeData({
      controllers: [],
      zones: [ORPHAN],
      zoneIssues: [{ zoneNum: '3', issues: ['Runoff'] }],
    })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).toContain('<span class="check-mark">')
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

  test('checked issue shows check-mark span', () => {
    const data = makeData({
      controllers: [CTRL],
      zones: [ZONE],
      zoneIssues: [{ zoneNum: '1', issues: ['Runoff'] }],
    })
    const html = generateIrrigationPdfHtml(data as any)
    expect(html).toContain('<span class="check-mark">')
  })

  test('unchecked issue shows empty td (no checkmark span)', () => {
    const data = makeData({
      controllers: [CTRL],
      zones: [ZONE],
      zoneIssues: [{ zoneNum: '1', issues: [] }],
    })
    const html = generateIrrigationPdfHtml(data as any)
    // The span element should not be present (CSS class name in <style> is fine)
    expect(html).not.toContain('<span class="check-mark">')
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
