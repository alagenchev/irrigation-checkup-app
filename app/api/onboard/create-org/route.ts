import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const bodySchema = z.object({
  companyName: z.string().min(1).max(255),
})

/**
 * POST /api/onboard/create-org
 *
 * Creates a Clerk organization and adds the current user to it.
 * Called by the onboarding form when a user needs to set up their first company.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 },
      )
    }

    const body = await req.json()
    const { companyName } = bodySchema.parse(body)

    // Get the Clerk client
    const clerk = await clerkClient()

    // Create the organization
    const org = await clerk.organizations.createOrganization({
      name: companyName,
    })

    // Add the user to the organization as admin
    await clerk.organizations.createOrganizationMembership({
      organizationId: org.id,
      userId,
      role: 'org:admin',
    })

    return NextResponse.json(
      { orgId: org.id },
      { status: 201 },
    )
  } catch (error: any) {
    console.error('Onboard error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create organization' },
      { status: 500 },
    )
  }
}
