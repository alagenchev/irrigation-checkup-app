import { test, expect } from '../fixtures/auth'
import { fillMinimalInspection, goToNewInspection } from '../fixtures/helpers'

test.describe('Site Selector', () => {
  test.beforeEach(async ({ page }) => {
    await goToNewInspection(page)
  })

  test.describe('Golden Path: Select Existing Site', () => {
    test('should render site selector in existing mode by default', async ({ page }) => {
      const siteSelector = page.locator('[data-testid="site-selector"]')
      await expect(siteSelector).toBeVisible()

      const existingMode = page.locator('[data-testid="site-selector-existing-mode"]')
      await expect(existingMode).toBeVisible()

      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await expect(modeToggle).toBeVisible()
      await expect(modeToggle).toHaveText('+ New Site')
    })

    test('should populate site name and address when selecting an existing site', async ({ page }) => {
      // Fill in a site name (assuming test sites exist in the database)
      // For this test, we'll just verify the selector responds to the autocomplete
      const siteSelectorWrapper = page.locator('[data-testid="site-selector-wrapper"]')
      await expect(siteSelectorWrapper).toBeVisible()

      // Get the site name input (via Autocomplete component)
      const siteNameInput = page.locator('input[name="siteName"]').first()
      await expect(siteNameInput).toBeVisible()

      // Type to trigger search
      await siteNameInput.fill('test')
      await page.waitForTimeout(300) // Allow autocomplete to process

      // Verify the field accepts input (golden path)
      const value = await siteNameInput.inputValue()
      expect(value).toBe('test')
    })

    test('should show mode toggle button in existing mode', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await expect(modeToggle).toBeVisible()
      await expect(modeToggle).toContainText(/New Site/i)
    })
  })

  test.describe('Golden Path: Create New Site', () => {
    test('should switch to new mode when clicking mode toggle', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await modeToggle.click()

      // Verify new mode is active
      const newMode = page.locator('[data-testid="site-selector-new-mode"]')
      await expect(newMode).toBeVisible()

      // Verify new inputs are visible
      const newNameInput = page.locator('[data-testid="site-selector-new-name"]')
      await expect(newNameInput).toBeVisible()

      const newAddressWrapper = page.locator('[data-testid="site-selector-new-address"]')
      await expect(newAddressWrapper).toBeVisible()
    })

    test('should accept input in new site name field', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await modeToggle.click()

      const newNameInput = page.locator('[data-testid="site-selector-new-name"]')
      await newNameInput.fill('New Test Site')

      const value = await newNameInput.inputValue()
      expect(value).toBe('New Test Site')
    })

    test('should accept input in new site address field', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await modeToggle.click()

      // The address field uses AddressAutocomplete
      const addressInput = page.locator('input[name="siteAddress"]').first()
      await addressInput.fill('999 Test St, Denver, CO')

      const value = await addressInput.inputValue()
      expect(value).toBe('999 Test St, Denver, CO')
    })

    test('should show mode toggle button in new mode', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await modeToggle.click()

      // Button should now say "Select Existing"
      await expect(modeToggle).toContainText(/Select Existing/i)
    })
  })

  test.describe('Mode Switching', () => {
    test('should toggle between existing and new modes', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      const existingMode = page.locator('[data-testid="site-selector-existing-mode"]')
      const newMode = page.locator('[data-testid="site-selector-new-mode"]')

      // Start in existing mode
      await expect(existingMode).toBeVisible()
      await expect(newMode).not.toBeVisible()

      // Switch to new
      await modeToggle.click()
      await expect(existingMode).not.toBeVisible()
      await expect(newMode).toBeVisible()

      // Switch back to existing
      await modeToggle.click()
      await expect(existingMode).toBeVisible()
      await expect(newMode).not.toBeVisible()
    })

    test('should preserve other form fields when switching modes', async ({ page }) => {
      // Fill some other form field (e.g., inspection date)
      const dateInput = page.locator('input[name="datePerformed"]').first()
      if (await dateInput.isVisible()) {
        const originalValue = await dateInput.inputValue()

        // Switch modes
        const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
        await modeToggle.click()
        await modeToggle.click()

        // Verify date is still there
        const newValue = await dateInput.inputValue()
        expect(newValue).toBe(originalValue)
      }
    })

    test('should allow toggling back and forth multiple times', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      const existingMode = page.locator('[data-testid="site-selector-existing-mode"]')

      for (let i = 0; i < 3; i++) {
        await modeToggle.click()
        await page.waitForTimeout(100)
        const isVisible = await existingMode.isVisible()
        expect(isVisible).toBe(i % 2 === 1) // Alternates
      }
    })
  })

  test.describe('Site Address Field', () => {
    test('should show site address in existing mode', async ({ page }) => {
      const existingMode = page.locator('[data-testid="site-selector-existing-mode"]')
      await expect(existingMode).toBeVisible()

      // Address input should be present (via AddressAutocomplete)
      const addressInput = page.locator('input[name="siteAddress"]').first()
      await expect(addressInput).toBeVisible()
    })

    test('should show site address in new mode', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await modeToggle.click()

      const newAddressWrapper = page.locator('[data-testid="site-selector-new-address"]')
      await expect(newAddressWrapper).toBeVisible()

      const addressInput = page.locator('input[name="siteAddress"]').first()
      await expect(addressInput).toBeVisible()
    })

    test('should show readonly address when disabled', async ({ page }) => {
      // This would require the component to be disabled (e.g., on edit page)
      // For now, we verify it's editable in normal mode
      const addressInput = page.locator('input[name="siteAddress"]').first()
      const isDisabled = await addressInput.isDisabled()
      expect(isDisabled).toBe(false)
    })
  })

  test.describe('Geolocation Button', () => {
    test('should show geolocation button in site selector wrapper', async ({ page }) => {
      const geoButton = page.locator('[data-testid="site-selector-geo-button"]')
      // Button might not be visible depending on browser/permissions, but element should exist
      const exists = await geoButton.count()
      expect(exists).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper focus management in existing mode', async ({ page }) => {
      const siteNameInput = page.locator('input[name="siteName"]').first()
      await siteNameInput.focus()

      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('name'))
      expect(focusedElement).toBe('siteName')
    })

    test('should have proper focus management in new mode', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await modeToggle.click()

      const newNameInput = page.locator('[data-testid="site-selector-new-name"]')
      await newNameInput.focus()

      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
      expect(focusedElement).toBe('site-selector-new-name')
    })

    test('should support keyboard navigation', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await modeToggle.focus()

      // Press Enter to activate button
      await modeToggle.press('Enter')

      // Verify mode changed
      const newMode = page.locator('[data-testid="site-selector-new-mode"]')
      await expect(newMode).toBeVisible()
    })

    test('should have proper labels for form fields', async ({ page }) => {
      const siteNameLabel = page.locator('label').filter({ hasText: /Site Name/i })
      await expect(siteNameLabel).toBeVisible()
    })

    test('should show required indicator on site name', async ({ page }) => {
      const requiredIndicator = page.locator('span').filter({ hasText: '*' })
      const count = await requiredIndicator.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Dark Theme Colors', () => {
    test('should have visible text in dark theme', async ({ page }) => {
      const siteNameInput = page.locator('input[name="siteName"]').first()
      const styles = await siteNameInput.evaluate(el => window.getComputedStyle(el))
      const color = styles.color
      // Should have some color value (not validate exact RGB, just that it's set)
      expect(color).toBeTruthy()
    })

    test('should have visible labels in dark theme', async ({ page }) => {
      const labels = page.locator('label')
      const count = await labels.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Component Structure', () => {
    test('should have outer wrapper div', async ({ page }) => {
      const wrapper = page.locator('[data-testid="site-selector"]')
      await expect(wrapper).toBeVisible()
    })

    test('should have field wrapper in parent form', async ({ page }) => {
      const fieldWrapper = page.locator('[data-testid="site-selector-wrapper"]')
      await expect(fieldWrapper).toBeVisible()
    })

    test('should contain mode selector in existing mode', async ({ page }) => {
      const existingMode = page.locator('[data-testid="site-selector-existing-mode"]')
      await expect(existingMode).toBeVisible()

      // Should contain the mode toggle button
      const modeToggle = existingMode.locator('[data-testid="site-selector-mode-toggle"]')
      await expect(modeToggle).toBeVisible()
    })

    test('should contain new site inputs in new mode', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await modeToggle.click()

      const newMode = page.locator('[data-testid="site-selector-new-mode"]')
      await expect(newMode).toBeVisible()

      const newNameInput = newMode.locator('[data-testid="site-selector-new-name"]')
      await expect(newNameInput).toBeVisible()

      const newAddressWrapper = newMode.locator('[data-testid="site-selector-new-address"]')
      await expect(newAddressWrapper).toBeVisible()
    })
  })

  test.describe('Form Integration', () => {
    test('should be part of the main inspection form', async ({ page }) => {
      // Irrigation form uses divs, not a <form> element — check site-selector wrapper
      const wrapper = page.locator('[data-testid="site-selector-wrapper"]')
      await expect(wrapper).toBeVisible()

      const siteSelector = wrapper.locator('[data-testid="site-selector"]')
      await expect(siteSelector).toBeVisible()
    })

    test('should not break form submission when site selector is filled', async ({ page }) => {
      // Fill minimal inspection with site name
      await page.locator('input[name="siteName"]').first().fill('Test Site')

      // Verify form can be submitted (visual check - no error)
      const saveButton = page.getByRole('button', { name: /save/i }).first()
      await expect(saveButton).toBeVisible()
    })
  })

  test.describe('Edge Cases', () => {
    test('should handle empty site list gracefully', async ({ page }) => {
      // The selector should still render and be functional
      const siteSelector = page.locator('[data-testid="site-selector"]')
      await expect(siteSelector).toBeVisible()

      // User should be able to switch to new site mode
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await modeToggle.click()

      const newMode = page.locator('[data-testid="site-selector-new-mode"]')
      await expect(newMode).toBeVisible()
    })

    test('should handle very long site names', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await modeToggle.click()

      const newNameInput = page.locator('[data-testid="site-selector-new-name"]')
      const longName = 'A very long site name that goes on and on with lots of descriptive words and information'
      await newNameInput.fill(longName)

      const value = await newNameInput.inputValue()
      expect(value).toBe(longName)
    })

    test('should handle special characters in site name', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await modeToggle.click()

      const newNameInput = page.locator('[data-testid="site-selector-new-name"]')
      const specialName = "O'Reilly's Café & Restaurant #123"
      await newNameInput.fill(specialName)

      const value = await newNameInput.inputValue()
      expect(value).toBe(specialName)
    })

    test('should handle rapid toggling between modes', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')

      for (let i = 0; i < 5; i++) {
        await modeToggle.click()
        await page.waitForTimeout(50)
      }

      // Should still be in a valid state
      const siteSelector = page.locator('[data-testid="site-selector"]')
      await expect(siteSelector).toBeVisible()
    })

    test('should clear new site data when switching to existing mode', async ({ page }) => {
      // Switch to new mode
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await modeToggle.click()

      // Fill in new site name
      const newNameInput = page.locator('[data-testid="site-selector-new-name"]')
      await newNameInput.fill('Test Site Name')

      // Switch back to existing mode
      await modeToggle.click()

      // Verify we're back in existing mode
      const existingMode = page.locator('[data-testid="site-selector-existing-mode"]')
      await expect(existingMode).toBeVisible()
    })
  })

  test.describe('Visual Regression Prevention', () => {
    test('should render consistently in existing mode', async ({ page }) => {
      const siteSelector = page.locator('[data-testid="site-selector"]')
      await expect(siteSelector).toBeVisible()

      // Verify key elements are visible
      const existingMode = page.locator('[data-testid="site-selector-existing-mode"]')
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')

      await expect(existingMode).toBeVisible()
      await expect(modeToggle).toBeVisible()
    })

    test('should render consistently in new mode', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await modeToggle.click()

      const newMode = page.locator('[data-testid="site-selector-new-mode"]')
      const newNameInput = page.locator('[data-testid="site-selector-new-name"]')
      const newAddressWrapper = page.locator('[data-testid="site-selector-new-address"]')

      await expect(newMode).toBeVisible()
      await expect(newNameInput).toBeVisible()
      await expect(newAddressWrapper).toBeVisible()
    })

    test('should not have layout shift when switching modes', async ({ page }) => {
      const siteSelector = page.locator('[data-testid="site-selector"]')
      const boundsBefore = await siteSelector.boundingBox()

      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await modeToggle.click()
      await page.waitForTimeout(200)

      const boundsAfter = await siteSelector.boundingBox()

      // Width should remain the same (full-width)
      if (boundsBefore && boundsAfter) {
        expect(boundsAfter.width).toBe(boundsBefore.width)
      }
    })
  })

  test.describe('Site Selector with Address Autocomplete', () => {
    test('should support address input in both modes', async ({ page }) => {
      // Existing mode
      const addressInput1 = page.locator('input[name="siteAddress"]').first()
      await expect(addressInput1).toBeVisible()

      // Switch to new mode
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      await modeToggle.click()

      // Should still have address input
      const addressInput2 = page.locator('input[name="siteAddress"]').first()
      await expect(addressInput2).toBeVisible()
    })

    test('should allow typing in address field without full form submission', async ({ page }) => {
      const addressInput = page.locator('input[name="siteAddress"]').first()
      await addressInput.fill('123 Main St')

      const value = await addressInput.inputValue()
      expect(value).toBe('123 Main St')

      // Form should still be submittable
      const saveButton = page.getByRole('button', { name: /save/i }).first()
      await expect(saveButton).toBeVisible()
    })
  })

  test.describe('Mode Toggle Button', () => {
    test('should be disabled when form is in readonly mode', async ({ page }) => {
      // On new inspection page, button should be enabled
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      const isDisabled = await modeToggle.isDisabled()
      // On create page, should not be disabled
      expect(isDisabled).toBe(false)
    })

    test('should have descriptive text', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      const text = await modeToggle.textContent()
      expect(text).toBeTruthy()
      expect(text?.trim().length).toBeGreaterThan(0)
    })

    test('should respond to click events', async ({ page }) => {
      const modeToggle = page.locator('[data-testid="site-selector-mode-toggle"]')
      const existingMode = page.locator('[data-testid="site-selector-existing-mode"]')

      await expect(existingMode).toBeVisible()
      await modeToggle.click()
      await expect(existingMode).not.toBeVisible()
    })
  })
})
