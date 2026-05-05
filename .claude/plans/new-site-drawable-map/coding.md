# Coding Instructions — new-site-drawable-map

**UUID**: `d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a`
**Agent**: Coding Agent

## Goal

Add a map-drawing phase to `app/sites/add-site-form.tsx` that appears after the equipment phase when a new site is created.

---

## Implementation

### 1. Import SiteMapEditor

```ts
import { SiteMapEditor } from '@/app/components/site-map-editor'
```

`SiteMapEditor` uses `next/dynamic` with `ssr: false` internally, so no extra dynamic wrapper needed here.

### 2. Add phase state

```ts
const [phase, setPhase] = useState<'equipment' | 'map'>('equipment')
```

Reset it inside `handleDone`:
```ts
function handleDone() {
  setCreatedSite(null)
  setPhase('equipment')
  // ... existing resets
}
```

### 3. Update handleSubmit success path

After `setCreatedSite(site)`, also ensure phase is 'equipment' (it should be by default, but be explicit):
```ts
setPhase('equipment')
```

### 4. Replace the `if (createdSite)` block

```tsx
if (createdSite && phase === 'equipment') {
  return (
    <div data-testid="add-site-equipment-phase">
      <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 16 }}>
        Site <strong style={{ color: '#ffffff' }}>{createdSite.name}</strong> created.
        Add equipment now, or skip and add it later from the table.
      </p>
      <button
        data-testid="add-site-skip-equipment"
        className="btn btn-sm"
        style={{ marginBottom: 16 }}
        onClick={() => setPhase('map')}
      >
        Skip — add equipment later
      </button>
      <SiteEquipmentEditor
        site={createdSite}
        onClose={() => setPhase('map')}
        onSave={() => setPhase('map')}
      />
    </div>
  )
}

if (createdSite && phase === 'map') {
  return (
    <div data-testid="add-site-map-phase">
      <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 16 }}>
        Draw the site boundary for <strong style={{ color: '#ffffff' }}>{createdSite.name}</strong>, or skip and do it later.
      </p>
      <button
        data-testid="add-site-skip-map"
        className="btn btn-sm"
        style={{ marginBottom: 16 }}
        onClick={handleDone}
      >
        Skip — draw map later
      </button>
      <SiteMapEditor
        siteId={createdSite.id}
        siteName={createdSite.name}
        onClose={handleDone}
      />
    </div>
  )
}
```

### 5. No other changes needed

The rest of the form, `handleSubmit`, and field state are untouched.

---

## Constraints

- Do not change `SiteMapEditor` or `SiteEquipmentEditor`
- Do not add any API changes — `SiteMapEditor` already handles save via `POST /api/sites/[siteId]/drawing`
- Keep `data-testid` attributes on both phase containers

---

## Commit Format

```
new-site-drawable-map (d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a): coding — map phase after equipment in add-site flow

- Add phase state ('equipment' | 'map') to add-site-form
- Equipment onSave/onClose transitions to map phase instead of handleDone
- Map phase shows SiteMapEditor with skip button

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
