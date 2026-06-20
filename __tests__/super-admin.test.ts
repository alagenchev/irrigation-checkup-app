/**
 * Unit tests for lib/super-admin.ts allow-list logic
 */

// Mock next/headers before importing the module under test
const mockCookieGet = jest.fn()
const mockCookieSet = jest.fn()
const mockCookieDelete = jest.fn()
const mockCookies = jest.fn().mockResolvedValue({
  get: mockCookieGet,
  set: mockCookieSet,
  delete: mockCookieDelete,
})

jest.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

// Mock auth from Clerk
const mockAuth = jest.fn()
jest.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
}))

import {
  isSuperAdmin,
  getSuperAdminSelectedCompanyId,
  setSuperAdminSelectedCompanyId,
  clearSuperAdminSelectedCompanyId,
} from '@/lib/super-admin'

const ORIGINAL_ENV = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = { ...ORIGINAL_ENV }
  mockCookieGet.mockReset()
  mockCookieSet.mockReset()
  mockCookieDelete.mockReset()
})

afterAll(() => {
  process.env = ORIGINAL_ENV
})

describe('isSuperAdmin', () => {
  it('returns false when SUPER_ADMIN_CLERK_USER_IDS is not set', () => {
    delete process.env.SUPER_ADMIN_CLERK_USER_IDS
    // isSuperAdmin reads the env at module load time, so test with the
    // already-loaded module (env was unset before the module loaded in this test suite)
    expect(isSuperAdmin('user_abc')).toBe(false)
  })

  it('returns false when user ID is null', () => {
    expect(isSuperAdmin(null)).toBe(false)
  })

  it('returns false when user ID is undefined', () => {
    expect(isSuperAdmin(undefined)).toBe(false)
  })

  it('returns false when user ID is not in the allow-list', () => {
    // The module was loaded with SUPER_ADMIN_CLERK_USER_IDS from env.
    // We test with a user ID that would never match an empty list.
    expect(isSuperAdmin('user_not_in_list')).toBe(false)
  })

  it('returns true when user ID IS in the allow-list', () => {
    // Re-require the module with a known env value
    process.env.SUPER_ADMIN_CLERK_USER_IDS = 'user_admin1,user_admin2'
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { isSuperAdmin: freshIsSuperAdmin } = require('@/lib/super-admin')
      expect(freshIsSuperAdmin('user_admin1')).toBe(true)
      expect(freshIsSuperAdmin('user_admin2')).toBe(true)
    })
  })

  it('returns false when user ID is not in a populated allow-list', () => {
    process.env.SUPER_ADMIN_CLERK_USER_IDS = 'user_admin1,user_admin2'
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { isSuperAdmin: freshIsSuperAdmin } = require('@/lib/super-admin')
      expect(freshIsSuperAdmin('user_other')).toBe(false)
    })
  })

  it('trims whitespace from env var entries', () => {
    process.env.SUPER_ADMIN_CLERK_USER_IDS = ' user_admin1 , user_admin2 '
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { isSuperAdmin: freshIsSuperAdmin } = require('@/lib/super-admin')
      expect(freshIsSuperAdmin('user_admin1')).toBe(true)
    })
  })
})

describe('getSuperAdminSelectedCompanyId', () => {
  it('returns null when cookie is not set', async () => {
    mockCookieGet.mockReturnValue(undefined)
    const result = await getSuperAdminSelectedCompanyId()
    expect(result).toBeNull()
  })

  it('returns the cookie value when cookie is set', async () => {
    mockCookieGet.mockReturnValue({ value: 'company-123' })
    const result = await getSuperAdminSelectedCompanyId()
    expect(result).toBe('company-123')
  })
})

describe('setSuperAdminSelectedCompanyId', () => {
  it('sets the cookie with httpOnly, sameSite lax, and secure in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true })

    await setSuperAdminSelectedCompanyId('company-456')

    expect(mockCookieSet).toHaveBeenCalledWith(
      'super_admin_selected_company',
      'company-456',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      })
    )

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, configurable: true })
  })

  it('sets the cookie with secure: false in non-production', async () => {
    await setSuperAdminSelectedCompanyId('company-789')

    expect(mockCookieSet).toHaveBeenCalledWith(
      'super_admin_selected_company',
      'company-789',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
      })
    )
  })
})

describe('clearSuperAdminSelectedCompanyId', () => {
  it('deletes the selected company cookie', async () => {
    await clearSuperAdminSelectedCompanyId()
    expect(mockCookieDelete).toHaveBeenCalledWith('super_admin_selected_company')
  })
})

describe('requireSuperAdmin (via actions/admin.ts)', () => {
  it('throws Forbidden when user is not a super admin', async () => {
    process.env.SUPER_ADMIN_CLERK_USER_IDS = 'user_admin1'
    mockAuth.mockResolvedValue({ userId: 'user_regular' })

    await expect(
      jest.isolateModulesAsync(async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getAllCompanies } = require('@/actions/admin')
        return getAllCompanies()
      })
    ).rejects.toThrow('Forbidden')
  })
})
