import { test, expect } from '../fixtures/auth'
import { fillMinimalInspection, todayISO } from '../fixtures/helpers'

const saveBtn = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /save/i }).first()

// ---------------------------------------------------------------------------
// Quote table layout — Location / Item / Description as separate textarea cols
// ---------------------------------------------------------------------------

test.describe('Quote table UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await fillMinimalInspection(page, 'Quote UX Test Site')
  })

  test('Location, Item, and Description inputs are textareas', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /\+ item/i })
    await expect(addBtn).toBeVisible()
    await addBtn.click()

    const locationTA = page.locator('textarea[placeholder="Controller1-Zone3"]').first()
    const itemTA     = page.locator('textarea[placeholder="Item name"]').first()
    const descTA     = page.locator('textarea[placeholder="Description"]').first()

    await expect(locationTA).toBeVisible()
    await expect(itemTA).toBeVisible()
    await expect(descTA).toBeVisible()
  })

  test('Location, Item, and Description are in separate columns', async ({ page }) => {
    // Verify all three column headers are present and distinct
    const headers = page.locator('table.quote-table-ui thead th')
    const texts = await headers.allTextContents()
    const labels = texts.map(t => t.trim())

    expect(labels).toContain('Location')
    expect(labels).toContain('Item')
    expect(labels).toContain('Description')

    // They must be separate headers, not combined
    const combined = labels.find(l => l.includes('Item') && l.includes('Description'))
    expect(combined).toBeUndefined()
  })

  test('Location placeholder says Controller1-Zone3', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /\+ item/i })
    await addBtn.click()

    const locationTA = page.locator('textarea[placeholder="Controller1-Zone3"]').first()
    await expect(locationTA).toBeVisible()
  })

  test('can type multi-line text into Location textarea', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /\+ item/i })
    await addBtn.click()

    const locationTA = page.locator('textarea[placeholder="Controller1-Zone3"]').first()
    await locationTA.fill('Controller 1\nZone 3')
    await expect(locationTA).toHaveValue('Controller 1\nZone 3')
  })

  test('can fill all three text columns independently', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /\+ item/i })
    await addBtn.click()

    await page.locator('textarea[placeholder="Controller1-Zone3"]').first().fill('Front yard')
    await page.locator('textarea[placeholder="Item name"]').first().fill('Replace rotor')
    await page.locator('textarea[placeholder="Description"]').first().fill('Broken head on zone 2')

    await expect(page.locator('textarea[placeholder="Controller1-Zone3"]').first()).toHaveValue('Front yard')
    await expect(page.locator('textarea[placeholder="Item name"]').first()).toHaveValue('Replace rotor')
    await expect(page.locator('textarea[placeholder="Description"]').first()).toHaveValue('Broken head on zone 2')
  })

  test('quote row total updates when price and qty are filled', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /\+ item/i })
    await addBtn.click()

    const priceInput = page.locator('input[type=number][placeholder="0.00"]').first()
    const qtyInput   = page.locator('input[type=number][min="1"]').first()

    await priceInput.fill('45')
    await qtyInput.fill('3')

    await expect(page.locator('text=$135.00')).toBeVisible()
  })

  test('"Total System Repair Estimate" field is not present', async ({ page }) => {
    await expect(page.locator('text=Total System Repair Estimate')).not.toBeVisible()
  })

  test('quote total shows $0.00 when no items added', async ({ page }) => {
    const totalCell = page.locator('table.quote-table-ui tfoot td').last()
    await expect(totalCell).toContainText('$0.00')
  })
})

// ---------------------------------------------------------------------------
// Inspection date — local date, not UTC
// ---------------------------------------------------------------------------

test.describe('New inspection date field', () => {
  test('date field defaults to today local date', async ({ page }) => {
    await page.goto('/')
    const dateInput = page.locator('input[type="date"]').first()
    await expect(dateInput).toHaveValue(todayISO())
  })

  test('date field value is not tomorrow (UTC-rollover bug)', async ({ page }) => {
    await page.goto('/')
    const dateInput = page.locator('input[type="date"]').first()
    const value = await dateInput.inputValue()

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowISO = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

    expect(value).not.toBe(tomorrowISO)
  })

  test('saved inspection appears in list with correct local date', async ({ page }) => {
    await page.goto('/')
    await fillMinimalInspection(page, 'Date Test Site')
    await saveBtn(page).click()
    await expect(page.locator('text=Saved successfully').first()).toBeVisible()

    await page.goto('/inspections')

    // todayISO() is YYYY-MM-DD; the list formats as MM/DD/YYYY
    const [y, m, d] = todayISO().split('-')
    const formatted = `${m}/${d}/${y}`

    const dateCell = page.locator('td', { hasText: formatted }).first()
    await expect(dateCell).toBeVisible()
  })
})
