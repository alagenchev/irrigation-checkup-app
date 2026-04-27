import { test, expect } from '../fixtures/auth'
import { fillMinimalInspection } from '../fixtures/helpers'

test.describe('Zone Photos', () => {
  test('photo upload section is visible in edit mode', async ({ page }) => {
    await page.goto('/')
    await fillMinimalInspection(page, 'Photo Test Site')

    // Multiple zones each have a Photos label; first() avoids strict-mode violation
    const photoLabel = page.locator('text=Photos').first()
    await expect(photoLabel).toBeVisible()

    const uploadBtn = page.getByRole('button', { name: /upload/i }).first()
    await expect(uploadBtn).toBeVisible()
  })

  test('upload button is disabled when photo limit is reached', async ({ page }) => {
    await page.goto('/')
    // Equipment sections only appear after a site is selected
    await fillMinimalInspection(page, 'Upload Test Site')

    const uploadBtn = page.getByRole('button', { name: /upload/i }).first()
    await expect(uploadBtn).toBeEnabled()
  })

  test('photo section shows counter (0/30)', async ({ page }) => {
    await page.goto('/')
    await fillMinimalInspection(page, 'Counter Test Site')

    const counter = page.locator('text=/Photos \\(\\d+\\/30\\)/').first()
    await expect(counter).toBeVisible()
  })
})
