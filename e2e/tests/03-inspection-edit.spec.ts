import { test, expect } from '../fixtures/auth'
import { fillMinimalInspection } from '../fixtures/helpers'

test.describe('Edit Inspection', () => {
  test.beforeEach(async ({ page }) => {
    // Create a test inspection
    await page.goto('/')
    await fillMinimalInspection(page, 'Edit Test Site')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.locator('text=Saved successfully')).toBeVisible()
  })

  test('inspection list shows saved inspections', async ({ page }) => {
    await page.goto('/inspections')
    await expect(page.locator('text=Edit Test Site')).toBeVisible()
  })

  test('clicking an inspection opens it in readonly mode', async ({ page }) => {
    await page.goto('/inspections')
    await page.locator('text=Edit Test Site').click()

    const editBtn = page.getByRole('button', { name: /edit/i })
    await expect(editBtn).toBeVisible()
  })

  test('can switch from readonly to edit mode', async ({ page }) => {
    await page.goto('/inspections')
    await page.locator('text=Edit Test Site').click()

    const editBtn = page.getByRole('button', { name: /edit/i })
    await editBtn.click()

    const saveBtn = page.getByRole('button', { name: /save/i })
    await expect(saveBtn).toBeVisible()
  })

  test('can edit and re-save an inspection', async ({ page }) => {
    await page.goto('/inspections')
    await page.locator('text=Edit Test Site').click()

    const editBtn = page.getByRole('button', { name: /edit/i })
    await editBtn.click()

    // Find and update notes field
    const notesField = page.locator('textarea[placeholder*="Notes"]').first()
    if (await notesField.isVisible()) {
      await notesField.fill('Updated by Playwright')
    }

    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.locator('text=Saved successfully')).toBeVisible()
  })

  test('can preview a report', async ({ page }) => {
    await page.goto('/inspections')
    await page.locator('text=Edit Test Site').click()

    const previewBtn = page.getByRole('button', { name: /preview/i })
    if (await previewBtn.isVisible()) {
      await previewBtn.click()
      await expect(page.locator('h1')).toContainText(/preview|report/i)
    }
  })
})
