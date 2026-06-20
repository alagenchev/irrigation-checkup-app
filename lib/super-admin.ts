import { cookies } from 'next/headers'

const SELECTED_COMPANY_COOKIE = 'super_admin_selected_company'
const SUPER_ADMIN_USER_IDS = (process.env.SUPER_ADMIN_CLERK_USER_IDS ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

export function isSuperAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false
  return SUPER_ADMIN_USER_IDS.includes(userId)
}

export async function getSuperAdminSelectedCompanyId(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(SELECTED_COMPANY_COOKIE)?.value ?? null
}

export async function setSuperAdminSelectedCompanyId(companyId: string): Promise<void> {
  const jar = await cookies()
  jar.set(SELECTED_COMPANY_COOKIE, companyId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function clearSuperAdminSelectedCompanyId(): Promise<void> {
  const jar = await cookies()
  jar.delete(SELECTED_COMPANY_COOKIE)
}
