import { createClientSchema, createSiteSchema, companySettingsSchema } from '@/lib/validators'

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
