# Coding Instructions: site-first-inspection-form

**UUID**: `c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f`

## Overview

Two files change: `app/irrigation-form.tsx` and `app/components/site-selector.tsx`.

No schema changes. No new server actions. No new files.

---

## Step 1 — Add lock states to `irrigation-form.tsx`

Add two new state variables immediately after the existing `equipmentError` state (~line 88):

```ts
const [clientLocked,    setClientLocked]    = useState(false)
const [equipmentLocked, setEquipmentLocked] = useState(false)
```

`clientLocked = true` means: client fields (name, address, email) are pre-populated from a selected
site and should appear greyed out. Any click on them unlocks all three at once.

`equipmentLocked = true` means: the equipment sections (System Overview, Backflows, Controllers,
Zones) are pre-populated from a selected site and should appear greyed out behind a transparent
overlay. Clicking anywhere on that overlay unlocks them.

---

## Step 2 — Set lock states in `handleSiteSelect`

At the end of `handleSiteSelect` (after `setEquipmentLoading(false)` in the `finally` block),
add:

```ts
setClientLocked(true)
setEquipmentLocked(true)
```

Place `setClientLocked(true)` right after `setSiteSelected(true)` (before the `try` block) so
that client fields lock as soon as the site is chosen, even while equipment is still loading.

Updated function shape:

```ts
async function handleSiteSelect(site: SiteWithClient) {
  setField('siteName', site.name)
  if (site.address)       setField('siteAddress', site.address)
  if (site.clientName)    setField('clientName', site.clientName)
  if (site.clientAddress) setField('clientAddress', site.clientAddress)

  setSiteSelected(true)
  setClientLocked(true)       // ← new
  setEquipmentLoading(true)
  setEquipmentError(null)

  try {
    const equipment = await getSiteEquipment(site.id)
    // ... existing equipment assignment ...
  } catch { ... } finally {
    setEquipmentLoading(false)
    setEquipmentLocked(true)  // ← new (set after load, not before, so overlay appears with data)
  }
}
```

---

## Step 3 — Clear lock states in `handleSiteModeChange`

In `handleSiteModeChange`, when switching to `'new'` mode, clear both locks:

```ts
function handleSiteModeChange(newMode: 'existing' | 'new') {
  setSiteMode(newMode)
  if (newMode === 'new') {
    setField('siteName', '')
    setField('siteAddress', '')
    setSiteSelected(true)
    setEquipmentError(null)
    setClientLocked(false)    // ← new
    setEquipmentLocked(false) // ← new
    setControllers([...])     // existing reset
    setZones([...])           // existing reset
    setBackflows([])
  } else {
    setSiteSelected(false)
    setEquipmentError(null)
    setClientLocked(false)    // ← new (clear when returning to search)
    setEquipmentLocked(false) // ← new
    // existing field clears if any
  }
}
```

---

## Step 4 — Reorder and update the "Client & Site" section in JSX

### Current layout (~line 556–638):
```
<section className="card">
  <h2>Client & Site</h2>
  <div className="grid-2">
    Client Name (Autocomplete)
    Client Address (AddressAutocomplete or readonly input)
    Client Email (input)
    <div className="field full-width"> SiteSelector + geo button </div>
  </div>
</section>
```

### New layout:

```tsx
{/* SITE & CLIENT */}
<section className="card">
  <h2>Site &amp; Client</h2>
  <div className="grid-2">

    {/* Site selector — full width, always first */}
    <div className="field full-width" data-testid="site-selector-wrapper">
      {fieldErrors.siteName && (
        <span style={{ color: '#ef4444', fontSize: 12, display: 'block', marginBottom: 4 }}>
          {fieldErrors.siteName}
        </span>
      )}
      <SiteSelector
        sites={sites}
        selectedSiteName={form.siteName}
        selectedAddress={form.siteAddress}
        mode={siteMode}
        onSiteSelect={handleSiteSelect}
        onModeChange={handleSiteModeChange}
        onNewSiteNameChange={v => setField('siteName', v)}
        onNewAddressChange={v => setField('siteAddress', v)}
        disabled={mode === 'readonly'}
      />
      {mode !== 'readonly' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleGetLocation}
            disabled={geoLoading}
            title="Use current location"
            data-testid="site-selector-geo-button"
          >
            {geoLoading ? '…' : '📍'}
          </button>
          {geoLoading && <span style={{ fontSize: 12, color: '#a1a1aa' }}>Getting location…</span>}
        </div>
      )}
      {geoResults.length > 0 && (
        /* existing geo results dropdown — unchanged */
      )}
      {geoError && (
        <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: 'block' }}>{geoError}</span>
      )}
    </div>

    {/* Client fields — below site, lockable */}
    <div className="field">
      <label>Client Name</label>
      {clientLocked ? (
        <input
          type="text"
          value={form.clientName}
          readOnly
          onClick={() => setClientLocked(false)}
          style={{ opacity: 0.6, cursor: 'pointer' }}
          title="Click to edit"
          data-testid="client-name-locked"
        />
      ) : (
        <Autocomplete
          name="clientName"
          value={form.clientName}
          onChange={v => setField('clientName', v)}
          onSelect={opt => {
            setField('clientName', opt.label)
            if (opt.address) setField('clientAddress', opt.address)
            if (opt.email)   setField('clientEmail', opt.email)
          }}
          options={clientOptions}
          placeholder="Type or select a client"
          disabled={mode === 'readonly'}
        />
      )}
    </div>

    <div className="field">
      <label>Client Address</label>
      {clientLocked || mode === 'readonly' ? (
        <input
          type="text"
          value={form.clientAddress}
          readOnly
          onClick={clientLocked ? () => setClientLocked(false) : undefined}
          style={clientLocked ? { opacity: 0.6, cursor: 'pointer' } : {}}
          title={clientLocked ? 'Click to edit' : undefined}
          data-testid={clientLocked ? 'client-address-locked' : undefined}
          disabled={mode === 'readonly'}
        />
      ) : (
        <AddressAutocomplete
          name="clientAddress"
          value={form.clientAddress}
          onChange={v => setField('clientAddress', v)}
          placeholder="123 Main St, City, TX"
        />
      )}
    </div>

    <div className="field">
      <label>Client Email</label>
      <input
        type="email"
        value={form.clientEmail}
        onChange={e => setField('clientEmail', e.target.value)}
        placeholder="email@example.com"
        readOnly={clientLocked}
        onClick={clientLocked ? () => setClientLocked(false) : undefined}
        style={clientLocked ? { opacity: 0.6, cursor: 'pointer' } : {}}
        title={clientLocked ? 'Click to edit' : undefined}
        data-testid={clientLocked ? 'client-email-locked' : undefined}
        disabled={mode === 'readonly'}
      />
    </div>

  </div>
</section>
```

**Key points:**
- `clientLocked` swaps `Autocomplete` for a plain `readOnly` input so there is no dropdown shown while locked.
- `clientAddress` already conditionally renders a plain input in `readonly` mode — add `clientLocked` to that same condition.
- Clicking any locked client field sets `clientLocked(false)`, which re-renders all three as their normal interactive versions. The `clientName` field reverts to `Autocomplete`, `clientAddress` reverts to `AddressAutocomplete`.
- `clientEmail` does not need `readOnly` to suppress a dropdown — just `readOnly` prevents direct editing.
- The `mode === 'readonly'` check takes precedence over `clientLocked` for `disabled`.

---

## Step 5 — Equipment lock overlay

The equipment sections are rendered inside the `siteSelected` branch (after the placeholder).
Wrap that entire `<>...</>` fragment in a relative container with a transparent overlay:

```tsx
) : (
  <div style={{ position: 'relative' }} data-testid="equipment-sections">

    {/* Lock overlay — shown when equipment was auto-populated from site */}
    {equipmentLocked && mode !== 'readonly' && (
      <div
        data-testid="equipment-lock-overlay"
        onClick={() => setEquipmentLocked(false)}
        title="Click to edit equipment"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          cursor: 'pointer',
          background: 'transparent',
        }}
      />
    )}

    {/* Dim content when locked */}
    <div style={{ opacity: equipmentLocked ? 0.55 : 1, transition: 'opacity 0.15s' }}>

      {/* SYSTEM OVERVIEW */}
      <section className="card"> ... </section>

      {/* BACKFLOWS */}
      <section className="card"> ... </section>

      {/* CONTROLLERS */}
      <section className="card"> ... </section>

      {/* ZONE DESCRIPTIONS */}
      <section className="card"> ... </section>

      {/* ZONE ISSUES */}
      <section className="card"> ... </section>

    </div>

  </div>
</>
```

**Key points:**
- The `QUOTE ITEMS` section is intentionally left outside the lock — it is not pre-populated from site data and should always be editable.
- The overlay `div` sits above the dimmed content in z-order. It captures the click and unlocks, then disappears (since `equipmentLocked` becomes false).
- `pointer-events` on the inner content div is NOT set to `none` — the overlay captures clicks first due to z-index. When locked=false the overlay is not rendered, so normal pointer events resume.
- `transition: 'opacity 0.15s'` provides a subtle visual feedback when unlocking.

---

## Step 6 — Update `SiteSelector` to group existing-mode inputs

In `app/components/site-selector.tsx`, in the `mode === 'existing'` branch, wrap the two field divs in a styled group div:

```tsx
{mode === 'existing' ? (
  <div data-testid="site-selector-existing-mode">

    {/* Existing Site group */}
    <div style={{
      border: '1px solid #3a3a3c',
      borderRadius: 8,
      padding: '12px 14px',
      marginBottom: 0,
    }}>
      <p style={{
        fontSize: 11,
        fontWeight: 600,
        color: '#a1a1aa',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        margin: '0 0 10px 0',
      }}>
        Existing Site
      </p>

      <div className="field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <label htmlFor="site-selector-search-input">
            Site Name <span style={{ color: '#ffffff' }}>*</span>
          </label>
          {!disabled && (
            <button
              type="button"
              className="btn btn-sm"
              data-testid="site-selector-mode-toggle"
              onClick={() => onModeChange('new')}
              style={{ fontSize: 11, padding: '2px 8px' }}
            >
              + New Site
            </button>
          )}
        </div>
        <Autocomplete ... />   {/* unchanged */}
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label>Site Address</label>
        {/* existing address input — unchanged */}
      </div>

    </div>

  </div>
) : (
  /* New mode — unchanged */
)}
```

The new-site mode (`mode === 'new'`) does NOT get a group box — it's a fresh form, not a search group.

---

## Pre-commit checklist

```bash
npm run build   # must pass — no type errors
npm test        # must pass — 271+ tests
```

No migration, no new files, no server action changes.

---

## Summary of all changes

| File | Change |
|------|--------|
| `app/irrigation-form.tsx` | Add `clientLocked` + `equipmentLocked` states; set/clear in handlers; reorder JSX (site first); locked client field rendering; equipment lock overlay wrapper |
| `app/components/site-selector.tsx` | Wrap existing-mode inputs in "Existing Site" styled group |
