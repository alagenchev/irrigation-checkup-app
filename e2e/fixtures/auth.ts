import { test as base, expect } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'

export const test = base.extend({
  page: async ({ page }, use) => {
    await setupClerkTestingToken({ page })
    await use(page)
  },
})

export { expect }
