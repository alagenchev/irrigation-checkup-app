'use server'

import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customerAccountTypes } from '@/lib/schema'
import { getRequiredCompanyId } from '@/lib/tenant'
import type { CustomerAccountType } from '@/types'

/**
 * Get all customer account types for the current company.
 */
export async function getCustomerAccountTypes(): Promise<CustomerAccountType[]> {
  const companyId = await getRequiredCompanyId()
  return db
    .select()
    .from(customerAccountTypes)
    .where(eq(customerAccountTypes.companyId, companyId))
    .orderBy(customerAccountTypes.type)
}

/**
 * Find a customer account type by name within the current company,
 * or create it if it doesn't exist.
 * Used when saving a client with a new customer account type.
 */
export async function findOrCreateCustomerAccountType(type: string): Promise<CustomerAccountType> {
  const companyId = await getRequiredCompanyId()

  const existing = await db
    .select()
    .from(customerAccountTypes)
    .where(and(eq(customerAccountTypes.companyId, companyId), eq(customerAccountTypes.type, type)))
    .limit(1)

  if (existing.length > 0) return existing[0]

  const [created] = await db
    .insert(customerAccountTypes)
    .values({ companyId, type })
    .onConflictDoNothing()
    .returning()

  if (created) return created

  // Race condition: another request created it
  const [winner] = await db
    .select()
    .from(customerAccountTypes)
    .where(and(eq(customerAccountTypes.companyId, companyId), eq(customerAccountTypes.type, type)))
    .limit(1)

  return winner!
}
