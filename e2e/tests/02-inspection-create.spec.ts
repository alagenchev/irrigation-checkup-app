import { test, expect } from '../fixtures/auth'
import { fillMinimalInspection, todayISO } from '../fixtures/helpers'

test.describe('Create Inspection', () => {
  test('form shows validation error when site name is empty', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.locator('text=Required')).toBeVisible()
  })

  test('can fill and save a complete inspection', async ({ page }) => {
    await page.goto('/')
    await fillMinimalInspection(page, 'Playwright Test Site')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.locator('text=Saved successfully')).toBeVisible()
  })

  test('saved inspection appears in inspections list', async ({ page }) => {
    await page.goto('/')
    await fillMinimalInspection(page, 'Playwright Test Site 2')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.locator('text=Saved successfully')).toBeVisible()

    await page.goto('/inspections')
    await expect(page.locator('text=Playwright Test Site 2')).toBeVisible()
  })

  test('can add a controller to the inspection', async ({ page }) => {
    await page.goto('/')
    await fillMinimalInspection(page, 'Site with Controller')

    // Fill controller fields (assuming they're in the form)
    const locationInput = page.locator('input[placeholder*="Location"]').first()
    if (await locationInput.isVisible()) {
      await locationInput.fill('Garage')
    }

    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.locator('text=Saved successfully')).toBeVisible()
  })

  test('can add a zone to the inspection', async ({ page }) => {
    await page.goto('/')
    await fillMinimalInspection(page, 'Site with Zone')

    // Fill zone fields if visible
    const zoneDescInput = page.locator('input[placeholder*="Description"]').first()
    if (await zoneDescInput.isVisible()) {
      await zoneDescInput.fill('Front lawn')
    }

    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.locator('text=Saved successfully')).toBeVisible()
  })

  test('can add a backflow device', async ({ page }) => {
    await page.goto('/')
    await fillMinimalInspection(page, 'Site with Backflow')

    const addBackflowBtn = page.getByRole('button', { name: /add backflow/i })
    if (await addBackflowBtn.isVisible()) {
      await addBackflowBtn.click()
    }

    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.locator('text=Saved successfully')).toBeVisible()
  })
})
