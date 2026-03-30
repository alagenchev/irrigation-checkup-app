import { createClientSchema } from '@/lib/validators'

describe('createClientSchema', () => {
  test('accepts a valid client with all fields', () => {
    const result = createClientSchema.safeParse({
      name: 'Acme Corp',
      address: '123 Main St',
      phone: '555-0000',
      email: 'info@acme.com',
      accountType: 'Commercial',
      accountNumber: 'ABC123',
    })
    expect(result.success).toBe(true)
  })

  test('accepts a client with only the required name field', () => {
    const result = createClientSchema.safeParse({ name: 'Bare Minimum LLC' })
    expect(result.success).toBe(true)
  })

  test('rejects when name is missing', () => {
    const result = createClientSchema.safeParse({})
    expect(result.success).toBe(false)
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
    const result = createClientSchema.safeParse({ name: 'Valid Name', email: '' })
    expect(result.success).toBe(true)
  })
})
