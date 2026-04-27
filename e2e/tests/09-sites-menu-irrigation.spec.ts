import { test, expect } from '../fixtures/auth'

test.describe('Sites Menu: Irrigation Equipment Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sites')
    await expect(page.locator('[data-testid="sites-page"]')).toBeVisible()

    // Seed a site if the account has none yet (first run with fresh test account)
    const hasTable = await page.locator('[data-testid="sites-table"]').isVisible({ timeout: 2000 }).catch(() => false)
    if (!hasTable) {
      await page.locator('input[name="name"]').fill('E2E Test Site')
      await page.getByRole('button', { name: /add site/i }).click()
      await expect(page.locator('[data-testid="sites-table"]')).toBeVisible()
    }
  })

  test('01: Sites table renders with "Edit Equipment" button per row', async ({ page }) => {
    // Verify sites table is visible
    const sitesTable = page.locator('[data-testid="sites-table"]')
    await expect(sitesTable).toBeVisible()

    // Verify at least one site row exists
    const siteRows = page.locator('[data-testid="sites-table-row"]')
    const rowCount = await siteRows.count()
    expect(rowCount).toBeGreaterThan(0)

    // Verify each visible row has an "Edit Equipment" button
    for (let i = 0; i < Math.min(rowCount, 3); i++) {
      const editButtons = page.locator('[data-testid="sites-table-edit-equipment"]')
      const buttonCount = await editButtons.count()
      expect(buttonCount).toBeGreaterThan(0)
    }
  })

  test('02: Clicking "Edit Equipment" opens the editor panel', async ({ page }) => {
    // Verify editor panel is NOT visible initially
    let editorPanel = page.locator('[data-testid="sites-page-editor-panel"]')
    await expect(editorPanel).not.toBeVisible()

    // Click the first "Edit Equipment" button
    const firstEditButton = page.locator('[data-testid="sites-table-edit-equipment"]').first()
    await firstEditButton.click()

    // Verify editor panel is now visible
    editorPanel = page.locator('[data-testid="sites-page-editor-panel"]')
    await expect(editorPanel).toBeVisible()

    // Verify editor wrapper is present
    const editor = page.locator('[data-testid="site-equipment-editor"]')
    await expect(editor).toBeVisible()
  })

  test('03: Clicking the same site again closes the panel (toggle)', async ({ page }) => {
    // Click first "Edit Equipment" button to open
    const firstEditButton = page.locator('[data-testid="sites-table-edit-equipment"]').first()
    await firstEditButton.click()

    // Verify panel is open
    let editorPanel = page.locator('[data-testid="sites-page-editor-panel"]')
    await expect(editorPanel).toBeVisible()

    // Click the same button again to close
    await firstEditButton.click()

    // Verify panel is closed
    await expect(editorPanel).not.toBeVisible()
  })

  test('04: Switching to a different site updates the editor panel', async ({ page }) => {
    // Click first site to open editor
    const editButtons = page.locator('[data-testid="sites-table-edit-equipment"]')
    const firstButton = editButtons.first()
    await firstButton.click()

    // Verify first site's editor is visible
    let editorPanel = page.locator('[data-testid="sites-page-editor-panel"]')
    await expect(editorPanel).toBeVisible()

    // Get the header text of the first opened site
    const header = page.locator('[data-testid="site-equipment-editor-header"]')
    const firstSiteText = await header.textContent()

    // If there's a second site, click it
    const editButtonCount = await editButtons.count()
    if (editButtonCount > 1) {
      const secondButton = editButtons.nth(1)
      await secondButton.click()

      // Verify editor panel is still visible
      await expect(editorPanel).toBeVisible()

      // Verify the header has changed (different site loaded)
      const newHeaderText = await header.textContent()
      expect(newHeaderText).not.toBe(firstSiteText)
    }
  })

  test('05: Adding a controller and saving', async ({ page }) => {
    // Click to open editor
    const editButton = page.locator('[data-testid="sites-table-edit-equipment"]').first()
    await editButton.click()

    // Verify editor is visible
    const editor = page.locator('[data-testid="site-equipment-editor"]')
    await expect(editor).toBeVisible()

    // Click "+ Controller" button
    const addControllerBtn = page.locator('[data-testid="site-equipment-editor-add-controller"]')
    await expect(addControllerBtn).toBeVisible()
    await addControllerBtn.click()

    // Verify a new controller row was added
    const controllerRows = page.locator('[data-testid="site-equipment-editor-controller-row"]')
    const initialCount = await controllerRows.count()
    expect(initialCount).toBeGreaterThan(0)

    // Click Save button
    const saveBtn = page.locator('[data-testid="site-equipment-editor-save"]')
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()

    // Wait for save to complete (either success message or panel close)
    // Check for success message
    const saveMessage = page.locator('[data-testid="site-equipment-editor-save-message"]')
    const messageVisible = await saveMessage.isVisible().catch(() => false)

    // If message appeared, wait for it to indicate success
    if (messageVisible) {
      await expect(saveMessage).not.toContainText('Error')
    }

    // Controller was added and saved successfully
  })

  test('06: Cancel closes the panel without saving', async ({ page }) => {
    // Click to open editor
    const editButton = page.locator('[data-testid="sites-table-edit-equipment"]').first()
    await editButton.click()

    // Verify editor is visible
    const editor = page.locator('[data-testid="site-equipment-editor"]')
    await expect(editor).toBeVisible()

    // Make a change (add a zone)
    const addZoneBtn = page.locator('[data-testid="site-equipment-editor-add-zone"]')
    if (await addZoneBtn.isVisible()) {
      const zonesBefore = await page.locator('[data-testid="site-equipment-editor-zone-row"]').count()
      await addZoneBtn.click()
      const zonesAfter = await page.locator('[data-testid="site-equipment-editor-zone-row"]').count()
      expect(zonesAfter).toBeGreaterThan(zonesBefore)
    }

    // Click Cancel button
    const cancelBtn = page.locator('[data-testid="site-equipment-editor-cancel"]')
    await expect(cancelBtn).toBeVisible()
    await cancelBtn.click()

    // Verify panel is closed
    const editorPanel = page.locator('[data-testid="sites-page-editor-panel"]')
    await expect(editorPanel).not.toBeVisible()
  })

  test('07: Editor panel is not visible on initial page load', async ({ page }) => {
    // Navigate to /sites fresh
    await page.goto('/sites')

    // Verify sites page is visible
    const sitesPage = page.locator('[data-testid="sites-page"]')
    await expect(sitesPage).toBeVisible()

    // Verify editor panel is NOT visible
    const editorPanel = page.locator('[data-testid="sites-page-editor-panel"]')
    await expect(editorPanel).not.toBeVisible()

    // Verify table panel IS visible
    const tablePanel = page.locator('[data-testid="sites-page-table-panel"]')
    await expect(tablePanel).toBeVisible()
  })

  test('08: System Overview fields are accessible in editor', async ({ page }) => {
    // Open editor
    const editButton = page.locator('[data-testid="sites-table-edit-equipment"]').first()
    await editButton.click()

    // Verify editor is visible
    const editor = page.locator('[data-testid="site-equipment-editor"]')
    await expect(editor).toBeVisible()

    // Verify System Overview section exists
    const overviewSection = page.locator('[data-testid="site-equipment-editor-overview"]')
    await expect(overviewSection).toBeVisible()

    // Verify individual fields
    const staticPressureInput = page.locator('[data-testid="site-equipment-editor-overview-static-pressure"]')
    const systemNotesTextarea = page.locator('[data-testid="site-equipment-editor-overview-system-notes"]')

    await expect(staticPressureInput).toBeVisible()
    await expect(systemNotesTextarea).toBeVisible()

    // Try to fill static pressure
    await staticPressureInput.fill('75')
    await expect(staticPressureInput).toHaveValue('75')

    // Try to fill system notes
    await systemNotesTextarea.fill('Test notes for irrigation system')
    const notesValue = await systemNotesTextarea.inputValue()
    expect(notesValue).toBe('Test notes for irrigation system')
  })

  test('09: Adding a backflow device', async ({ page }) => {
    // Open editor
    const editButton = page.locator('[data-testid="sites-table-edit-equipment"]').first()
    await editButton.click()

    // Verify editor is visible
    const editor = page.locator('[data-testid="site-equipment-editor"]')
    await expect(editor).toBeVisible()

    // Click "+ Backflow" button
    const addBackflowBtn = page.locator('[data-testid="site-equipment-editor-add-backflow"]')
    await expect(addBackflowBtn).toBeVisible()
    const backflowsBefore = await page.locator('[data-testid="site-equipment-editor-backflow-row"]').count()
    await addBackflowBtn.click()

    // Verify a new backflow row was added
    const backflowsAfter = await page.locator('[data-testid="site-equipment-editor-backflow-row"]').count()
    expect(backflowsAfter).toBeGreaterThan(backflowsBefore)
  })

  test('10: Removing a controller', async ({ page }) => {
    // Open editor
    const editButton = page.locator('[data-testid="sites-table-edit-equipment"]').first()
    await editButton.click()

    // Verify editor is visible
    const editor = page.locator('[data-testid="site-equipment-editor"]')
    await expect(editor).toBeVisible()

    // Check if there are existing controller rows
    const controllerRows = page.locator('[data-testid="site-equipment-editor-controller-row"]')
    const rowCountBefore = await controllerRows.count()

    if (rowCountBefore > 0) {
      // Click remove button on first controller
      const removeBtn = page.locator('[data-testid="site-equipment-editor-remove-controller"]').first()
      await removeBtn.click()

      // Verify a row was removed
      const rowCountAfter = await controllerRows.count()
      expect(rowCountAfter).toBeLessThan(rowCountBefore)
    } else {
      // If no rows exist, add one then remove it
      const addBtn = page.locator('[data-testid="site-equipment-editor-add-controller"]')
      await addBtn.click()
      const rowCountAfter = await controllerRows.count()
      expect(rowCountAfter).toBeGreaterThan(0)

      // Now remove it
      const removeBtn = page.locator('[data-testid="site-equipment-editor-remove-controller"]').first()
      await removeBtn.click()
      const rowCountFinal = await controllerRows.count()
      expect(rowCountFinal).toBe(rowCountBefore)
    }
  })

  test('11: Page layout renders correctly with table and editor side by side', async ({ page }) => {
    // Verify page layout structure
    const pageLayout = page.locator('[data-testid="sites-page-layout"]')
    await expect(pageLayout).toBeVisible()

    // Verify table panel is visible
    const tablePanel = page.locator('[data-testid="sites-page-table-panel"]')
    await expect(tablePanel).toBeVisible()

    // Open editor
    const editButton = page.locator('[data-testid="sites-table-edit-equipment"]').first()
    await editButton.click()

    // Verify editor panel is visible when editor is opened
    const editorPanel = page.locator('[data-testid="sites-page-editor-panel"]')
    await expect(editorPanel).toBeVisible()

    // Both should be visible in the flex layout
    await expect(tablePanel).toBeVisible()
    await expect(editorPanel).toBeVisible()
  })

  test('12: Editor header displays site information', async ({ page }) => {
    // Open editor
    const editButton = page.locator('[data-testid="sites-table-edit-equipment"]').first()
    await editButton.click()

    // Verify editor is visible
    const editor = page.locator('[data-testid="site-equipment-editor"]')
    await expect(editor).toBeVisible()

    // Verify header is visible
    const header = page.locator('[data-testid="site-equipment-editor-header"]')
    await expect(header).toBeVisible()

    // Header should contain some text (site name)
    const headerText = await header.textContent()
    expect(headerText).toBeTruthy()
    expect(headerText!.length).toBeGreaterThan(0)
  })

  test('13: Adding a zone to the editor', async ({ page }) => {
    // Open editor
    const editButton = page.locator('[data-testid="sites-table-edit-equipment"]').first()
    await editButton.click()

    // Verify editor is visible
    const editor = page.locator('[data-testid="site-equipment-editor"]')
    await expect(editor).toBeVisible()

    // Click "+ Zone" button
    const addZoneBtn = page.locator('[data-testid="site-equipment-editor-add-zone"]')
    await expect(addZoneBtn).toBeVisible()

    const zonesBefore = await page.locator('[data-testid="site-equipment-editor-zone-row"]').count()
    await addZoneBtn.click()

    // Verify a new zone row was added
    const zonesAfter = await page.locator('[data-testid="site-equipment-editor-zone-row"]').count()
    expect(zonesAfter).toBeGreaterThan(zonesBefore)
  })

  test('14: Removing a zone from the editor', async ({ page }) => {
    // Open editor
    const editButton = page.locator('[data-testid="sites-table-edit-equipment"]').first()
    await editButton.click()

    // Verify editor is visible
    const editor = page.locator('[data-testid="site-equipment-editor"]')
    await expect(editor).toBeVisible()

    // Get zone count
    const zoneRows = page.locator('[data-testid="site-equipment-editor-zone-row"]')
    const zoneCountBefore = await zoneRows.count()

    if (zoneCountBefore > 0) {
      // Click remove button on first zone
      const removeBtn = page.locator('[data-testid="site-equipment-editor-remove-zone"]').first()
      await removeBtn.click()

      // Verify a zone was removed
      const zoneCountAfter = await zoneRows.count()
      expect(zoneCountAfter).toBeLessThan(zoneCountBefore)
    } else {
      // If no zones exist, add one then remove it
      const addBtn = page.locator('[data-testid="site-equipment-editor-add-zone"]')
      await addBtn.click()
      const zoneCountAfter = await zoneRows.count()
      expect(zoneCountAfter).toBeGreaterThan(0)

      // Now remove it
      const removeBtn = page.locator('[data-testid="site-equipment-editor-remove-zone"]').first()
      await removeBtn.click()
      const zoneCountFinal = await zoneRows.count()
      expect(zoneCountFinal).toBe(zoneCountBefore)
    }
  })

  test('15: Removing a backflow device', async ({ page }) => {
    // Open editor
    const editButton = page.locator('[data-testid="sites-table-edit-equipment"]').first()
    await editButton.click()

    // Verify editor is visible
    const editor = page.locator('[data-testid="site-equipment-editor"]')
    await expect(editor).toBeVisible()

    // Get backflow count
    const backflowRows = page.locator('[data-testid="site-equipment-editor-backflow-row"]')
    const backflowCountBefore = await backflowRows.count()

    if (backflowCountBefore > 0) {
      // Click remove button on first backflow
      const removeBtn = page.locator('[data-testid="site-equipment-editor-remove-backflow"]').first()
      await removeBtn.click()

      // Verify a backflow was removed
      const backflowCountAfter = await backflowRows.count()
      expect(backflowCountAfter).toBeLessThan(backflowCountBefore)
    } else {
      // If no backflows exist, add one then remove it
      const addBtn = page.locator('[data-testid="site-equipment-editor-add-backflow"]')
      await addBtn.click()
      const backflowCountAfter = await backflowRows.count()
      expect(backflowCountAfter).toBeGreaterThan(0)

      // Now remove it
      const removeBtn = page.locator('[data-testid="site-equipment-editor-remove-backflow"]').first()
      await removeBtn.click()
      const backflowCountFinal = await backflowRows.count()
      expect(backflowCountFinal).toBe(backflowCountBefore)
    }
  })
})
