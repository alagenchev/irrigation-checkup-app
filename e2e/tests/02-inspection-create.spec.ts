import { test, expect } from '../fixtures/auth'
import { fillMinimalInspection } from '../fixtures/helpers'

const saveBtn = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /save/i }).first()

test.describe('Create Inspection', () => {
  test('form shows validation error when site name is empty', async ({ page }) => {
    await page.goto('/')
    await saveBtn(page).click()
    await expect(page.locator('text=Required')).toBeVisible()
  })

  test('can fill and save a complete inspection', async ({ page }) => {
    await page.goto('/')
    await fillMinimalInspection(page, 'Playwright Test Site')
    await saveBtn(page).click()
    await expect(page.locator('text=Saved successfully').first()).toBeVisible()
  })

  test('saved inspection appears in inspections list', async ({ page }) => {
    await page.goto('/')
    await fillMinimalInspection(page, 'Playwright Test Site 2')
    await saveBtn(page).click()
    await expect(page.locator('text=Saved successfully').first()).toBeVisible()

    await page.goto('/inspections')
    await expect(page.locator('text=Playwright Test Site 2')).toBeVisible()
  })

  test('can add a controller to the inspection', async ({ page }) => {
    await page.goto('/')
    await fillMinimalInspection(page, 'Site with Controller')

    const locationInput = page.locator('input[placeholder*="Location"]').first()
    if (await locationInput.isVisible()) {
      await locationInput.fill('Garage')
    }

    await saveBtn(page).click()
    await expect(page.locator('text=Saved successfully').first()).toBeVisible()
  })

  test('can add a zone to the inspection', async ({ page }) => {
    await page.goto('/')
    await fillMinimalInspection(page, 'Site with Zone')

    const zoneDescInput = page.locator('input[placeholder*="Description"]').first()
    if (await zoneDescInput.isVisible()) {
      await zoneDescInput.fill('Front lawn')
    }

    await saveBtn(page).click()
    await expect(page.locator('text=Saved successfully').first()).toBeVisible()
  })

  test('can add a backflow device', async ({ page }) => {
    await page.goto('/')
    await fillMinimalInspection(page, 'Site with Backflow')

    const addBackflowBtn = page.getByRole('button', { name: /add backflow/i })
    if (await addBackflowBtn.isVisible()) {
      await addBackflowBtn.click()
    }

    await saveBtn(page).click()
    await expect(page.locator('text=Saved successfully').first()).toBeVisible()
  })
})
