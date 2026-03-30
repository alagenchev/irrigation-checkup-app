import { ClerkProvider, UserButton, SignInButton, SignUpButton, Show } from '@clerk/nextjs'
import Link from 'next/link'
import './globals.css'

export const metadata = { title: 'Irrigation Checkup' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <header className="top-nav">
            <div className="nav-left">
              <Link href="/" className="nav-brand">💧 Irrigation Checkup</Link>
              <nav>
                <Link href="/clients">Clients</Link>
                <Link href="/sites">Sites</Link>
              </nav>
            </div>
            <Show when="signed-out">
              <SignInButton />
              <SignUpButton />
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          {children}
          <footer>
            <p>© {new Date().getFullYear()} FieldTechPro. All rights reserved.</p>
          </footer>
        </ClerkProvider>
      </body>
    </html>
  )
}
