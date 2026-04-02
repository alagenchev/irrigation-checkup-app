import {
  createClientSchema, createSiteSchema, companySettingsSchema,
  createTechnicianSchema, createInspectorSchema, createSiteVisitSchema,
  createSiteControllerSchema, createSiteZoneSchema, createSiteBackflowSchema,
  saveInspectionSchema,
} from '@/lib/validators'

describe('createClientSchema', () => {
  test('accepts a valid client with all fields', () => {
    const result = createClientSchema.safeParse({
      name: 'Acme Corp', address: '123 Main St', phone: '555-0000',
      email: 'info@acme.com', accountType: 'Commercial', accountNumber: 'ABC123',
    })
    expect(result.success).toBe(true)
  })

  test('accepts a client with only the required name field', () => {
    expect(createClientSchema.safeParse({ name: 'Bare Minimum LLC' }).success).toBe(true)
  })

  test('rejects when name is missing', () => {
    expect(createClientSchema.safeParse({}).success).toBe(false)
  })

  test('rejects when name is an empty string', () => {
    const result = createClientSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toMatch(/required/i)
  })

  test('rejects when email is not a valid email address', () => {
    const result = createClientSchema.safeParse({ name: 'Valid Name', email: 'not-an-email' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toMatch(/invalid email/i)
  })

  test('accepts an empty string email (field left blank)', () => {
    expect(createClientSchema.safeParse({ name: 'Valid Name', email: '' }).success).toBe(true)
  })
})

describe('createSiteSchema', () => {
  test('accepts a valid site with all fields', () => {
    const result = createSiteSchema.safeParse({
      name: 'Acme HQ', address: '123 Main St', clientName: 'Acme Corp', notes: 'Main campus',
    })
    expect(result.success).toBe(true)
  })

  test('accepts a site with only the required name field', () => {
    expect(createSiteSchema.safeParse({ name: 'Minimal Site' }).success).toBe(true)
  })

  test('rejects when name is missing', () => {
    expect(createSiteSchema.safeParse({}).success).toBe(false)
  })

  test('rejects when name is empty', () => {
    const result = createSiteSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toMatch(/required/i)
  })

  test('accepts a site without a client (clientName optional)', () => {
    expect(createSiteSchema.safeParse({ name: 'No Client Site' }).success).toBe(true)
  })
})

describe('companySettingsSchema', () => {
  test('accepts valid company settings with all fields', () => {
    const result = companySettingsSchema.safeParse({
      companyName: 'Acme LLC', licenseNum: 'TX123', companyAddress: '1 Main St',
      companyCityStateZip: 'Dallas, TX 75001', companyPhone: '5550000', performedBy: 'Jane',
    })
    expect(result.success).toBe(true)
  })

  test('accepts settings with only companyName (all others optional)', () => {
    expect(companySettingsSchema.safeParse({ companyName: 'Minimal Co' }).success).toBe(true)
  })

  test('rejects when companyName is missing', () => {
    expect(companySettingsSchema.safeParse({}).success).toBe(false)
  })

  test('rejects when companyName is empty', () => {
    const result = companySettingsSchema.safeParse({ companyName: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toMatch(/required/i)
  })
})

describe('createTechnicianSchema', () => {
  test('accepts a valid technician name', () => {
    expect(createTechnicianSchema.safeParse({ name: 'Jane Smith' }).success).toBe(true)
  })

  test('rejects when name is missing', () => {
    expect(createTechnicianSchema.safeParse({}).success).toBe(false)
  })

  test('rejects when name is empty', () => {
    const result = createTechnicianSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toMatch(/required/i)
  })
})

describe('createInspectorSchema', () => {
  test('accepts a valid inspector with all fields', () => {
    const result = createInspectorSchema.safeParse({
      firstName: 'Jane', lastName: 'Smith',
      email: 'jane@example.com', phone: '555-1234', licenseNum: 'TX-001',
    })
    expect(result.success).toBe(true)
  })

  test('accepts an inspector with only required fields', () => {
    expect(createInspectorSchema.safeParse({ firstName: 'Jane', lastName: 'Smith' }).success).toBe(true)
  })

  test('rejects when firstName is missing', () => {
    const result = createInspectorSchema.safeParse({ lastName: 'Smith' })
    expect(result.success).toBe(false)
  })

  test('rejects when firstName is empty', () => {
    const result = createInspectorSchema.safeParse({ firstName: '', lastName: 'Smith' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toMatch(/first name is required/i)
  })

  test('rejects when lastName is missing', () => {
    const result = createInspectorSchema.safeParse({ firstName: 'Jane' })
    expect(result.success).toBe(false)
  })

  test('rejects when email is not a valid email address', () => {
    const result = createInspectorSchema.safeParse({ firstName: 'Jane', lastName: 'Smith', email: 'not-an-email' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toMatch(/invalid email/i)
  })

  test('accepts an empty string email (field left blank)', () => {
    expect(createInspectorSchema.safeParse({ firstName: 'Jane', lastName: 'Smith', email: '' }).success).toBe(true)
  })

  test('optional fields (phone, licenseNum) are truly optional', () => {
    expect(createInspectorSchema.safeParse({ firstName: 'Jane', lastName: 'Smith' }).success).toBe(true)
  })
})

describe('createSiteVisitSchema', () => {
  const VALID: Parameters<typeof createSiteVisitSchema.safeParse>[0] = {
    siteId:        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    datePerformed: '2025-06-15',
  }

  test('accepts minimal valid input', () => {
    expect(createSiteVisitSchema.safeParse(VALID).success).toBe(true)
  })

  test('defaults inspectionType to "Repair Inspection" when omitted', () => {
    const r = createSiteVisitSchema.safeParse(VALID)
    expect(r.success && r.data.inspectionType).toBe('Repair Inspection')
  })

  test('defaults status to "New" when omitted', () => {
    const r = createSiteVisitSchema.safeParse(VALID)
    expect(r.success && r.data.status).toBe('New')
  })

  test('rejects when siteId is missing', () => {
    expect(createSiteVisitSchema.safeParse({ datePerformed: '2025-06-15' }).success).toBe(false)
  })

  test('rejects when datePerformed is missing', () => {
    expect(createSiteVisitSchema.safeParse({ siteId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }).success).toBe(false)
  })

  test('rejects an invalid date format', () => {
    const r = createSiteVisitSchema.safeParse({ siteId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', datePerformed: '15/06/2025' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toMatch(/YYYY-MM-DD/i)
  })

  test('accepts all optional fields (no equipment arrays — those live in their own tables)', () => {
    const r = createSiteVisitSchema.safeParse({
      ...VALID,
      clientId:    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      inspectorId: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      inspectionType:  'Start-up',
      accountType:  'Commercial',
      accountNumber: 'A123',
      status:       'In Progress',
      dueDate:      '2025-07-01',
      repairEstimate: '250.00',
      inspectionNotes:   'All zones tested.',
      internalNotes:  'Client prefers morning visits.',
      staticPressure: '65.5',
      backflowInstalled:   true,
      backflowServiceable: true,
      isolationValve:      true,
      systemNotes: 'Hunter Pro-HC installed.',
      zoneIssues: [{ zoneNum: '1', issues: ['Runoff'] }],
      quoteItems: [],
    })
    expect(r.success).toBe(true)
  })
})

describe('createSiteControllerSchema', () => {
  test('accepts valid controller with all fields', () => {
    expect(createSiteControllerSchema.safeParse({
      siteId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', location: 'Front', manufacturer: 'Hunter',
      model: 'Pro-HC', sensors: 'Rain', numZones: '6', masterValve: true,
    }).success).toBe(true)
  })

  test('accepts controller with only siteId (all equipment fields optional)', () => {
    expect(createSiteControllerSchema.safeParse({ siteId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }).success).toBe(true)
  })

  test('rejects when siteId is missing', () => {
    expect(createSiteControllerSchema.safeParse({ manufacturer: 'Hunter' }).success).toBe(false)
  })

  test('defaults numZones to "0" and masterValve to false', () => {
    const r = createSiteControllerSchema.safeParse({ siteId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
    expect(r.success && r.data.numZones).toBe('0')
    expect(r.success && r.data.masterValve).toBe(false)
  })
})

describe('createSiteZoneSchema', () => {
  test('accepts a valid zone', () => {
    expect(createSiteZoneSchema.safeParse({
      siteId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', zoneNum: '3', landscapeTypes: ['Full-sun turf'], irrigationTypes: ['Rotor'],
    }).success).toBe(true)
  })

  test('rejects when zoneNum is missing', () => {
    expect(createSiteZoneSchema.safeParse({ siteId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }).success).toBe(false)
  })

  test('defaults landscapeTypes and irrigationTypes to empty arrays', () => {
    const r = createSiteZoneSchema.safeParse({ siteId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', zoneNum: '1' })
    expect(r.success && r.data.landscapeTypes).toEqual([])
    expect(r.success && r.data.irrigationTypes).toEqual([])
  })
})

describe('createSiteBackflowSchema', () => {
  test('accepts a valid backflow device', () => {
    expect(createSiteBackflowSchema.safeParse({
      siteId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', manufacturer: 'Febco', type: 'RPZ', model: '825Y', size: '1',
    }).success).toBe(true)
  })

  test('accepts with only siteId (all device fields optional)', () => {
    expect(createSiteBackflowSchema.safeParse({ siteId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }).success).toBe(true)
  })

  test('rejects when siteId is missing', () => {
    expect(createSiteBackflowSchema.safeParse({ type: 'RPZ' }).success).toBe(false)
  })
})

describe('saveInspectionSchema', () => {
  const VALID = {
    siteName: 'Acme HQ', datePerformed: '2025-06-15',
    backflowInstalled: false, backflowServiceable: false, isolationValve: false,
    controllers: [], zones: [], backflows: [], zoneIssues: {}, quoteItems: [],
  }

  test('accepts minimal valid input', () => {
    expect(saveInspectionSchema.safeParse(VALID).success).toBe(true)
  })

  test('rejects when siteName is missing', () => {
    const { siteName: _, ...rest } = VALID
    expect(saveInspectionSchema.safeParse(rest).success).toBe(false)
  })

  test('rejects when siteName is empty', () => {
    const r = saveInspectionSchema.safeParse({ ...VALID, siteName: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toMatch(/required/i)
  })

  test('rejects when datePerformed is missing', () => {
    const { datePerformed: _, ...rest } = VALID
    expect(saveInspectionSchema.safeParse(rest).success).toBe(false)
  })

  test('rejects an invalid date format', () => {
    const r = saveInspectionSchema.safeParse({ ...VALID, datePerformed: '06/15/2025' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toMatch(/YYYY-MM-DD/i)
  })

  test('accepts full input with all optional fields', () => {
    const r = saveInspectionSchema.safeParse({
      ...VALID,
      clientName: 'Acme Corp', clientAddress: '1 Main St',
      inspectorId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      inspectionType: 'Start-up', accountType: 'Commercial', accountNumber: 'A1',
      status: 'In Progress', dueDate: '2025-07-01', repairEstimate: '350.00',
      inspectionNotes: 'All clear.', internalNotes: 'Note.',
      staticPressure: '68.0', systemNotes: 'Hunter Pro-HC',
      backflowInstalled: true, backflowServiceable: true, isolationValve: true,
      controllers: [{ id: 1, location: 'Front', manufacturer: 'Hunter', model: 'Pro-HC', sensors: 'Rain', numZones: '6', masterValve: false, masterValveNotes: '', notes: '' }],
      zones: [{ id: 2, zoneNum: '1', controller: '1', description: 'Lawn', landscapeTypes: ['Full-sun turf'], irrigationTypes: ['Rotor'], notes: '', photoUrls: [] }],
      backflows: [],
      quoteItems: [],
      zoneIssues: { '1': ['Runoff'] },
    })
    expect(r.success).toBe(true)
  })
})
