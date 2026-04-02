'use client'

import { useState } from 'react'
import { useAuth, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

/**
 * Onboarding page for users who are signed in but have no Clerk org.
 * Collects company name, creates the org, adds user to it, then redirects.
 *
 * Middleware should redirect users without orgId here:
 *   if (auth().userId && !auth().orgId) {
 *     return NextResponse.redirect(new URL('/onboard', request.url))
 *   }
 */

export default function OnboardPage() {
  const { userId } = useAuth()
  const { client } = useClerk()
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!userId) {
    return <p>Please sign in first.</p>
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim()) {
      setError('Company name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create org via Clerk Backend API
      // This requires a server action (client can't call Clerk Backend API directly)
      const res = await fetch('/api/onboard/create-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim() }),
      })

      if (!res.ok) {
        const { error: apiError } = await res.json()
        throw new Error(apiError || 'Failed to create organization')
      }

      // Org created and user added. Reload to refresh auth context.
      window.location.href = '/'
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">Welcome</h1>
        <p className="text-gray-600 mb-6">
          Let's set up your company account. Enter your company name below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
              Company name
            </label>
            <input
              id="company"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Acme Irrigation"
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
          >
            {loading ? 'Setting up...' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
