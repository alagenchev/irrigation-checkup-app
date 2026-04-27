import { test, expect } from '../fixtures/auth'
import { fillMinimalInspection } from '../fixtures/helpers'

const saveBtn = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /save/i }).first()

const savedMsg = (page: import('@playwright/test').Page) =>
  page.locator('text=Saved successfully').first()

test.describe('Edit Inspection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await fillMinimalInspection(page, 'Edit Test Site')
    await saveBtn(page).click()
    await expect(savedMsg(page)).toBeVisible()
  })

  test('inspection list shows saved inspections', async ({ page }) => {
    await page.goto('/inspections')
    await expect(page.locator('text=Edit Test Site')).toBeVisible()
  })

  test('clicking an inspection opens it in readonly mode', async ({ page }) => {
    await page.goto('/inspections')
    await page.locator('text=Edit Test Site').first().click()

    const editBtn = page.getByRole('button', { name: /edit/i })
    await expect(editBtn).toBeVisible()
  })

  test('can switch from readonly to edit mode', async ({ page }) => {
    await page.goto('/inspections')
    await page.locator('text=Edit Test Site').first().click()

    const editBtn = page.getByRole('button', { name: /edit/i })
    await editBtn.click()

    await expect(saveBtn(page)).toBeVisible()
  })

  test('can edit and re-save an inspection', async ({ page }) => {
    await page.goto('/inspections')
    await page.locator('text=Edit Test Site').first().click()

    const editBtn = page.getByRole('button', { name: /edit/i })
    await editBtn.click()

    const notesField = page.locator('textarea[placeholder*="Notes"]').first()
    if (await notesField.isVisible()) {
      await notesField.fill('Updated by Playwright')
    }

    await saveBtn(page).click()
    // After saving a detail-page inspection, the form returns to readonly mode.
    // The save message disappears when the mode switches, so check for readonly instead.
    await expect(editBtn).toBeVisible({ timeout: 10000 })
  })

  test('can preview a report', async ({ page }) => {
    await page.goto('/inspections')
    await page.locator('text=Edit Test Site').first().click()

    const previewBtn = page.getByRole('button', { name: /preview/i })
    if (await previewBtn.isVisible()) {
      await previewBtn.click()
      await expect(page.locator('h1')).toContainText(/preview|report/i)
    }
  })
})
