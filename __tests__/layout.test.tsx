/**
 * Guards against invalid Clerk component imports in RootLayout.
 * Regression test for: "Element type is invalid: expected a string or class/function but got undefined"
 *
 * @clerk/nextjs v7+: Show, SignInButton, SignUpButton, UserButton are the correct exports.
 * SignedIn / SignedOut were removed in v7 — using them causes the crash.
 */
import * as ClerkNextjs from '@clerk/nextjs'

describe('Clerk imports used in layout.tsx', () => {
  it('ClerkProvider is exported from @clerk/nextjs', () => {
    expect(typeof ClerkNextjs.ClerkProvider).toBe('function')
  })

  it('UserButton is exported from @clerk/nextjs', () => {
    expect(typeof ClerkNextjs.UserButton).toBe('function')
  })

  it('Show is exported from @clerk/nextjs (replaces deprecated SignedIn/SignedOut)', () => {
    expect(typeof ClerkNextjs.Show).toBe('function')
  })

  it('SignInButton is exported from @clerk/nextjs', () => {
    expect(typeof ClerkNextjs.SignInButton).toBe('function')
  })

  it('SignUpButton is exported from @clerk/nextjs', () => {
    expect(typeof ClerkNextjs.SignUpButton).toBe('function')
  })

  it('SignedIn does NOT exist in v7+ (removed — causes crash if used)', () => {
    expect((ClerkNextjs as Record<string, unknown>).SignedIn).toBeUndefined()
  })

  it('SignedOut does NOT exist in v7+ (removed — causes crash if used)', () => {
    expect((ClerkNextjs as Record<string, unknown>).SignedOut).toBeUndefined()
  })
})
