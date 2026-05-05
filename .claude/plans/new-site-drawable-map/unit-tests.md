# Unit Tests — new-site-drawable-map

**UUID**: `d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a`
**Agent**: Testing Agent

## Test File

Add tests to `__tests__/add-site-form.test.tsx` (already exists).

`SiteMapEditor` uses Mapbox + `next/dynamic` — mock it at the top of the test file:
```ts
jest.mock('@/app/components/site-map-editor', () => ({
  SiteMapEditor: ({ siteId, siteName, onClose }: { siteId: string; siteName: string; onClose: () => void }) => (
    <div data-testid="mock-site-map-editor" data-site-id={siteId}>
      <span>{siteName}</span>
      <button onClick={onClose}>Close Map</button>
    </div>
  ),
}))
```

---

## Test Cases

### 1. Equipment phase renders normally (regression)
```
it('shows equipment editor after site creation')
it('shows skip-equipment button in equipment phase')
```

### 2. Transition: equipment → map

```
it('transitions to map phase when skip-equipment is clicked')
it('transitions to map phase when SiteEquipmentEditor onSave fires')
it('transitions to map phase when SiteEquipmentEditor onClose fires')
```

After transition:
- `add-site-equipment-phase` is gone
- `add-site-map-phase` is visible
- `mock-site-map-editor` is visible with correct `siteId`

### 3. Map phase UI

```
it('shows skip-map button in map phase')
it('shows site name in map phase description')
it('renders SiteMapEditor with the created site id')
```

### 4. Exiting the map phase

```
it('returns to blank form when skip-map is clicked')
it('returns to blank form when SiteMapEditor onClose fires')
```

After exit: `add-site-form` is visible, `add-site-map-phase` is gone.

### 5. Full flow (equipment skip → map skip)

```
it('completes full add-site flow: create → skip equipment → skip map → blank form')
```

---

## Commit Format

```
new-site-drawable-map (d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a): unit-tests — map phase transitions in add-site-form

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
