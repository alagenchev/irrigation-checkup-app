# Coding Instructions — add-site-map-inline

**UUID**: `e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b`

## Goal

Show the drawable satellite map inline in the Add Site form, GPS-centered with address auto-fill. Drawing is stored in state and saved after the site is created. The post-creation map phase (phase 3) is removed.

---

## Step 1 — Extend SiteMapEditorInner

File: `app/components/site-map-editor-inner.tsx`

Add new optional props:

```ts
interface SiteMapEditorInnerProps {
  siteId?: string                                              // now optional
  siteName?: string                                           // now optional
  onClose?: () => void                                        // now optional
  initialCenter?: [number, number]                            // [lng, lat] — GPS default
  initialDrawing?: GeoJSON.FeatureCollection | null           // pre-load a drawing
  onDrawingChange?: (drawing: GeoJSON.FeatureCollection) => void  // called on every change
  height?: number                                             // default 480
}
```

Behaviour changes:
- `center` in `new mapboxgl.Map(...)`: use `initialCenter ?? [-98.5795, 39.8283]`
- `zoom`: use `initialCenter ? 15 : 3` (zoom in tight when GPS is available)
- `loadDrawing`: only runs when `siteId` is provided
- `saveDrawing`: when `siteId` is provided → POST to API (existing behaviour); when no `siteId` → call `onDrawingChange?.(draw.getAll())`
- `initialDrawing`: after map loads, if provided, call `draw.add(initialDrawing)`
- Container `style.height`: use `height ?? 480`
- The header (h3 + Close button) should only render when `siteName` or `onClose` are provided

## Step 2 — Update SiteMapEditor wrapper

File: `app/components/site-map-editor.tsx`

Pass through the new props to `SiteMapEditorInner`. The dynamic import should already forward all props — just update the TypeScript interface to match.

## Step 3 — Update AddSiteForm

File: `app/sites/add-site-form.tsx`

### 3a — GPS + reverse geocode on mount

```ts
const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)
const [drawing, setDrawing] = useState<GeoJSON.FeatureCollection | null>(null)
```

On mount (useEffect with empty deps):
```ts
useEffect(() => {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude: lat, longitude: lng } = pos.coords
    setMapCenter([lng, lat])
    // Reverse geocode
    const res = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`)
    if (!res.ok) return
    const results: string[] = await res.json()
    if (results[0] && !siteAddress) setAddress(results[0])
  })
}, [])
```

Replace `setAddress(results[0])` with whatever the correct state setter is for the address field (read the existing form state to find it — likely `setSiteAddress` or via a controlled input state).

### 3b — Layout: side-by-side

Wrap the form fields and the map in a flex row:

```tsx
<div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
  <div style={{ flex: '0 0 420px', minWidth: 0 }}>
    {/* all existing form fields */}
  </div>
  <div style={{ flex: '1 1 auto', minWidth: 280 }}>
    <SiteMapEditor
      initialCenter={mapCenter ?? undefined}
      initialDrawing={drawing}
      onDrawingChange={setDrawing}
      height={360}
    />
  </div>
</div>
```

Pass `mapCenter` only when it is non-null (undefined falls back to the USA default inside the component).

### 3c — Save drawing after site creation

In `handleSubmit`, after getting the new site back from `createSite`, save the drawing if one exists:

```ts
const newSite = result  // whatever createSite returns — check the actual return type
if (drawing && newSite?.id) {
  await fetch(`/api/sites/${newSite.id}/drawing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(drawing),
  })
}
setCreatedSite(newSite)
setPhase('equipment')
```

Read `handleSubmit` carefully to find where `setCreatedSite` is called and insert the save there.

### 3d — Remove phase 3 (map phase)

Delete the entire `if (createdSite && phase === 'map')` block — the map is now shown during form filling so there's no need for a separate post-creation map phase.

Also remove the `phase` state and its reset in `handleDone`, and remove the `SiteMapEditor` import if it's no longer used elsewhere in the file.

### 3e — Reset drawing on handleDone

```ts
setDrawing(null)
setMapCenter(null)  // let the next form session re-request GPS
```

---

## Constraints

- Do not change the map component's save-to-API logic for the existing siteId path
- Do not break the Sites table "Map" button flow
- TypeScript strict — no `any`
- Run `npm run build` before reporting done

---

## Commit format

```
add-site-map-inline (e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b): coding — inline map with GPS default in add-site form

- SiteMapEditorInner: optional siteId, initialCenter, onDrawingChange, height props
- AddSiteForm: GPS on mount → reverse geocode → auto-fill address + center map
- Drawing saved to API after site creation
- Removed phase-3 map block (map now inline during form filling)
- Side-by-side layout: form fields left, map right

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
