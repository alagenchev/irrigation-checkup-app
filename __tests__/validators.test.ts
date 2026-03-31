import {
  createClientSchema, createSiteSchema, companySettingsSchema,
  createTechnicianSchema, createSiteVisitSchema,
  createSiteControllerSchema, createSiteZoneSchema, createSiteBackflowSchema,
  saveCheckupSchema,
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

describe('createSiteVisitSchema', () => {
  const VALID: Parameters<typeof createSiteVisitSchema.safeParse>[0] = {
    siteId:        1,
    datePerformed: '2025-06-15',
  }

  test('accepts minimal valid input', () => {
    expect(createSiteVisitSchema.safeParse(VALID).success).toBe(true)
  })

  test('defaults checkupType to "Repair Checkup" when omitted', () => {
    const r = createSiteVisitSchema.safeParse(VALID)
    expect(r.success && r.data.checkupType).toBe('Repair Checkup')
  })

  test('defaults status to "New" when omitted', () => {
    const r = createSiteVisitSchema.safeParse(VALID)
    expect(r.success && r.data.status).toBe('New')
  })

  test('rejects when siteId is missing', () => {
    expect(createSiteVisitSchema.safeParse({ datePerformed: '2025-06-15' }).success).toBe(false)
  })

  test('rejects when datePerformed is missing', () => {
    expect(createSiteVisitSchema.safeParse({ siteId: 1 }).success).toBe(false)
  })

  test('rejects an invalid date format', () => {
    const r = createSiteVisitSchema.safeParse({ siteId: 1, datePerformed: '15/06/2025' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toMatch(/YYYY-MM-DD/i)
  })

  test('accepts all optional fields (no equipment arrays — those live in their own tables)', () => {
    const r = createSiteVisitSchema.safeParse({
      ...VALID,
      clientId:     2,
      technicianId: 3,
      checkupType:  'Start-up',
      accountType:  'Commercial',
      accountNumber: 'A123',
      status:       'In Progress',
      dueDate:      '2025-07-01',
      repairEstimate: '250.00',
      checkupNotes:   'All zones tested.',
      internalNotes:  'Client prefers morning visits.',
      staticPressure: '65.5',
      backflowInstalled:   true,
      backflowServiceable: true,
      isolationValve:      true,
      systemNotes: 'Hunter Pro-HC installed.',
      zoneIssues: [{ zoneNum: '1', issues: ['Runoff'] }],
      zoneNotes:  [],
      quoteItems: [],
    })
    expect(r.success).toBe(true)
  })
})

describe('createSiteControllerSchema', () => {
  test('accepts valid controller with all fields', () => {
    expect(createSiteControllerSchema.safeParse({
      siteId: 1, location: 'Front', manufacturer: 'Hunter',
      model: 'Pro-HC', sensors: 'Rain', numZones: '6', masterValve: true,
    }).success).toBe(true)
  })

  test('accepts controller with only siteId (all equipment fields optional)', () => {
    expect(createSiteControllerSchema.safeParse({ siteId: 1 }).success).toBe(true)
  })

  test('rejects when siteId is missing', () => {
    expect(createSiteControllerSchema.safeParse({ manufacturer: 'Hunter' }).success).toBe(false)
  })

  test('defaults numZones to "0" and masterValve to false', () => {
    const r = createSiteControllerSchema.safeParse({ siteId: 1 })
    expect(r.success && r.data.numZones).toBe('0')
    expect(r.success && r.data.masterValve).toBe(false)
  })
})

describe('createSiteZoneSchema', () => {
  test('accepts a valid zone', () => {
    expect(createSiteZoneSchema.safeParse({
      siteId: 1, zoneNum: '3', landscapeTypes: ['Full-sun turf'], irrigationTypes: ['Rotor'],
    }).success).toBe(true)
  })

  test('rejects when zoneNum is missing', () => {
    expect(createSiteZoneSchema.safeParse({ siteId: 1 }).success).toBe(false)
  })

  test('defaults landscapeTypes and irrigationTypes to empty arrays', () => {
    const r = createSiteZoneSchema.safeParse({ siteId: 1, zoneNum: '1' })
    expect(r.success && r.data.landscapeTypes).toEqual([])
    expect(r.success && r.data.irrigationTypes).toEqual([])
  })
})

describe('createSiteBackflowSchema', () => {
  test('accepts a valid backflow device', () => {
    expect(createSiteBackflowSchema.safeParse({
      siteId: 1, manufacturer: 'Febco', type: 'RPZ', model: '825Y', size: '1',
    }).success).toBe(true)
  })

  test('accepts with only siteId (all device fields optional)', () => {
    expect(createSiteBackflowSchema.safeParse({ siteId: 1 }).success).toBe(true)
  })

  test('rejects when siteId is missing', () => {
    expect(createSiteBackflowSchema.safeParse({ type: 'RPZ' }).success).toBe(false)
  })
})

describe('saveCheckupSchema', () => {
  const VALID = {
    siteName: 'Acme HQ', datePerformed: '2025-06-15',
    backflowInstalled: false, backflowServiceable: false, isolationValve: false,
    controllers: [], zones: [], backflows: [], zoneIssues: {}, zoneNotes: [], quoteItems: [],
  }

  test('accepts minimal valid input', () => {
    expect(saveCheckupSchema.safeParse(VALID).success).toBe(true)
  })

  test('rejects when siteName is missing', () => {
    const { siteName: _, ...rest } = VALID
    expect(saveCheckupSchema.safeParse(rest).success).toBe(false)
  })

  test('rejects when siteName is empty', () => {
    const r = saveCheckupSchema.safeParse({ ...VALID, siteName: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toMatch(/required/i)
  })

  test('rejects when datePerformed is missing', () => {
    const { datePerformed: _, ...rest } = VALID
    expect(saveCheckupSchema.safeParse(rest).success).toBe(false)
  })

  test('rejects an invalid date format', () => {
    const r = saveCheckupSchema.safeParse({ ...VALID, datePerformed: '06/15/2025' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toMatch(/YYYY-MM-DD/i)
  })

  test('accepts full input with all optional fields', () => {
    const r = saveCheckupSchema.safeParse({
      ...VALID,
      clientName: 'Acme Corp', clientAddress: '1 Main St',
      technicianName: 'Jane Smith',
      checkupType: 'Start-up', accountType: 'Commercial', accountNumber: 'A1',
      status: 'In Progress', dueDate: '2025-07-01', repairEstimate: '350.00',
      checkupNotes: 'All clear.', internalNotes: 'Note.',
      staticPressure: '68.0', systemNotes: 'Hunter Pro-HC',
      backflowInstalled: true, backflowServiceable: true, isolationValve: true,
      controllers: [{ id: 1, location: 'Front', manufacturer: 'Hunter', model: 'Pro-HC', sensors: 'Rain', numZones: '6', masterValve: false, notes: '' }],
      zones: [{ id: 2, zoneNum: '1', controller: '1', description: 'Lawn', landscapeTypes: ['Full-sun turf'], irrigationTypes: ['Rotor'] }],
      zoneIssues: { '1': ['Runoff'] },
    })
    expect(r.success).toBe(true)
  })
})
