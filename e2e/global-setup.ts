import { clerkSetup, clerk } from '@clerk/testing/playwright'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

config({ path: '.env.local' })

const AUTH_FILE = path.join(__dirname, '../playwright/.auth/user.json')
const BASE_URL = 'http://localhost:3000'
const TEST_EMAIL = process.env.E2E_TEST_EMAIL!

export default async function globalSetup() {
  if (!TEST_EMAIL) {
    throw new Error('E2E_TEST_EMAIL must be set in .env.local')
  }

  // Always call clerkSetup - it's required for setupClerkTestingToken
  await clerkSetup()

  // Skip auth file refresh if it exists and is less than 24 hours old
  if (fs.existsSync(AUTH_FILE)) {
    const stats = fs.statSync(AUTH_FILE)
    const ageInMs = Date.now() - stats.mtimeMs
    const ageInHours = ageInMs / (1000 * 60 * 60)
    if (ageInHours < 24) {
      // Auth file is fresh, skip refreshing it
      return
    }
  }

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // clerk.signIn requires a prior goto to a page that loads Clerk JS
  await page.goto(`${BASE_URL}/sign-in`)

  // Uses sign-in token ticket strategy internally — bypasses password form,
  // email verification, and factor-two entirely
  await clerk.signIn({ page, emailAddress: TEST_EMAIL })

  if (page.url().includes('/onboard')) {
    await page.goto(BASE_URL)
  }

  await page.waitForTimeout(1000)

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  await context.storageState({ path: AUTH_FILE })
  await browser.close()
}
