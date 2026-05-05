# Coding Instructions — irrigation-map-ux

**UUID**: `f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c`
**Agent**: Coding Agent
**Read first**: `.claude/plans/irrigation-map-ux/README.md` for full UX spec and frame analysis.

---

## Pre-work

```bash
npm install @turf/turf
```

Check whether `@types/geojson` is already in `package.json`; add if missing.

Read these files before touching anything:
- `lib/schema.ts` — understand existing tables (`site_drawings`, etc.)
- `app/components/site-map-editor-inner.tsx` — current map implementation
- `app/components/site-map-editor.tsx` — dynamic wrapper
- `app/sites/sites-page-client.tsx` — panel state management
- `app/sites/sites-table.tsx` — current "Map" button
- `actions/upload.ts` — existing photo upload action
- `app/api/sites/[siteId]/drawing/route.ts` — existing drawing API

---

## Phase 1 — Schema: Multiple maps per site

### `lib/schema.ts`

Add a new `siteMaps` table. Keep the existing `siteDrawings` table untouched during this phase (migrate data later).

```ts
export const siteMaps = pgTable('site_maps', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  siteId: uuid('site_id').notNull().references(() => sites.id),
  name: text('name').notNull().default('Main'),
  drawing: jsonb('drawing'),  // GeoJSON FeatureCollection | null
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
export type SiteMap = typeof siteMaps.$inferSelect
export type NewSiteMap = typeof siteMaps.$inferInsert
```

Run after schema change:
```bash
npx drizzle-kit generate
DATABASE_URL=postgresql://localhost:5432/irrigation_test npx tsx scripts/migrate.ts
```

### `actions/site-maps.ts` (new file)

```ts
'use server'
import { getRequiredCompanyId } from '@/lib/tenant'
import { db } from '@/lib/db'
import { siteMaps } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'

export async function getSiteMaps(siteId: string) {
  const companyId = await getRequiredCompanyId()
  return db.query.siteMaps.findMany({
    where: and(eq(siteMaps.siteId, siteId), eq(siteMaps.companyId, companyId)),
    orderBy: (m, { asc }) => asc(m.createdAt),
  })
}

export async function createSiteMap(siteId: string, name: string) {
  const companyId = await getRequiredCompanyId()
  const [map] = await db.insert(siteMaps).values({ siteId, companyId, name }).returning()
  return map
}

export async function saveSiteMapDrawing(mapId: string, drawing: object) {
  const companyId = await getRequiredCompanyId()
  await db.update(siteMaps)
    .set({ drawing, updatedAt: new Date() })
    .where(and(eq(siteMaps.id, mapId), eq(siteMaps.companyId, companyId)))
}

export async function deleteSiteMap(mapId: string) {
  const companyId = await getRequiredCompanyId()
  await db.delete(siteMaps)
    .where(and(eq(siteMaps.id, mapId), eq(siteMaps.companyId, companyId)))
}

export async function duplicateSiteMap(mapId: string, newName: string) {
  const companyId = await getRequiredCompanyId()
  const original = await db.query.siteMaps.findFirst({
    where: and(eq(siteMaps.id, mapId), eq(siteMaps.companyId, companyId)),
  })
  if (!original) throw new Error('Map not found')
  const [copy] = await db.insert(siteMaps)
    .values({ siteId: original.siteId, companyId, name: newName, drawing: original.drawing })
    .returning()
  return copy
}
```

---

## Phase 2 — Maps list UI

### `app/sites/sites-table.tsx`

Change the "Map" button label to "Maps":
```tsx
<button ... data-testid="sites-table-view-map" onClick={() => onViewMap(s.id)}>
  Maps
</button>
```

### `app/components/map/maps-list-panel.tsx` (new file)

Props: `siteId: string`, `siteName: string`, `onEditMap: (mapId: string) => void`, `onClose: () => void`

Renders:
- Header: "Maps for {siteName}" + Close button
- List of `SiteMap` rows (fetched via `getSiteMaps`):
  - Map name, feature count (count of `drawing.features`), formatted date
  - **Edit** button → calls `onEditMap(map.id)`
  - **Duplicate** button → prompt for new name → `duplicateSiteMap`
  - **Delete** (via `...` menu or swipe) → `deleteSiteMap`
- **"+ Create New Map"** button (dashed border) → opens `CreateMapModal`

### `app/components/map/create-map-modal.tsx` (new file)

Modal with:
- Name input (default: "Map {n+1}")
- "Start from:" radio: Empty map | Copy from existing (select dropdown of existing maps)
- Cancel / Create

On Create → `createSiteMap(siteId, name)` → optionally `duplicateSiteMap` if copying → calls `onCreated(newMapId)`.

### `app/sites/sites-page-client.tsx`

Update `PanelState`:
```ts
type PanelState =
  | { type: 'equipment'; siteId: string }
  | { type: 'maps-list'; siteId: string }       // new: shows maps list
  | { type: 'map-editor'; siteId: string; mapId: string }  // new: edit specific map
  | null
```

`handleViewMap(siteId)` → set `{ type: 'maps-list', siteId }`.
`handleEditMap(siteId, mapId)` → set `{ type: 'map-editor', siteId, mapId }`.

Render `MapsListPanel` for `maps-list` state, `MapCanvas` for `map-editor` state.

---

## Phase 3 — Custom drawing toolbar + map canvas shell

### `app/components/map/map-canvas.tsx` (replaces site-map-editor-inner.tsx)

This is the main map component. It replaces `SiteMapEditorInner`. It is loaded via `next/dynamic` with `ssr: false`.

Props:
```ts
interface MapCanvasProps {
  mapId: string
  siteName: string
  onClose: () => void
  // for inline add-site form use (no mapId yet):
  initialCenter?: [number, number]
  initialDrawing?: GeoJSON.FeatureCollection | null
  onDrawingChange?: (drawing: GeoJSON.FeatureCollection) => void
  height?: number
}
```

Internal state:
```ts
type DrawMode = 'idle' | 'zone' | 'wire' | 'point'
const [mode, setMode] = useState<DrawMode>('idle')
const [features, setFeatures] = useState<GeoJSON.Feature[]>([])  // all saved features
const [draftPoints, setDraftPoints] = useState<[number, number][]>([])  // in-progress polygon/line
const [undoStack, setUndoStack] = useState<GeoJSON.Feature[][]>([])
const [redoStack, setRedoStack] = useState<GeoJSON.Feature[][]>([])
const [isSynced, setIsSynced] = useState(true)
const [selectedFeature, setSelectedFeature] = useState<GeoJSON.Feature | null>(null)
const [showAddPoint, setShowAddPoint] = useState(false)
const [pendingPointCoord, setPendingPointCoord] = useState<[number, number] | null>(null)
```

**Map initialisation** (useEffect):
```ts
const map = new mapboxgl.Map({
  container: containerRef.current,
  style: 'mapbox://styles/mapbox/satellite-streets-v12',
  center: initialCenter ?? [-98.5795, 39.8283],
  zoom: initialCenter ? 15 : 3,
})
// NO MapboxDraw — all drawing is custom
map.on('click', handleMapClick)
```

**Map click handler**:
- If `mode === 'zone'` or `mode === 'wire'`: append coordinate to `draftPoints`
- If `mode === 'point'`: set `pendingPointCoord`, open `showAddPoint` sheet
- If `mode === 'idle'`: check if click hits a feature → open zone info for it

**Rendering features** on map: use `map.addSource` / `map.addLayer` for:
- Completed zone polygons (fill + outline, color/opacity from properties)
- In-progress draft polygon (dashed line + dots)
- Controller/head/point markers (symbol or circle layers)
- Wire line-strings

**Saving**: when `features` changes, debounce 800ms → `saveSiteMapDrawing(mapId, featureCollection)` → set `isSynced(true)`.

### `app/components/map/drawing-toolbar.tsx` (new file)

Bottom toolbar strip:
```tsx
<div data-testid="map-toolbar">
  <button onClick={undo} disabled={undoStack.length === 0}>Undo</button>
  <button onClick={redo} disabled={redoStack.length === 0}>Redo</button>
  <span>{isSynced ? 'All synced' : 'Saving…'}</span>
  <div> {/* tool buttons */}
    <button data-testid="map-tool-point" onClick={() => setMode('point')}>📍</button>
    <button data-testid="map-tool-zone"  onClick={() => setMode('zone')}>⬡</button>
    <button data-testid="map-tool-wire"  onClick={() => setMode('wire')}>〰</button>
  </div>
  <button onClick={() => map.zoomIn()}>+</button>
  <button onClick={() => map.zoomOut()}>-</button>
</div>
```

Active mode pill (top-left overlay):
```tsx
{mode !== 'idle' && (
  <div data-testid="map-mode-tag">
    {mode === 'zone' ? 'Drawing Zone' : mode === 'wire' ? 'Drawing Wire' : 'Adding Point'}
    <button onClick={() => { setMode('idle'); setDraftPoints([]) }}>✕</button>
  </div>
)}
```

---

## Phase 4 — Zone drawing with live stats

### In `map-canvas.tsx`

**Live stats bar** (shown when `mode === 'zone'` and `draftPoints.length > 0`):
```tsx
import * as turf from '@turf/turf'

const liveArea = useMemo(() => {
  if (draftPoints.length < 3) return null
  const closed = [...draftPoints, draftPoints[0]]
  const poly = turf.polygon([closed])
  const areaSqFt = turf.area(poly) * 10.7639  // m² → sq ft
  const perimeterFt = turf.length(turf.lineString(closed), { units: 'feet' })
  return { areaSqFt: Math.round(areaSqFt), perimeterFt: Math.round(perimeterFt) }
}, [draftPoints])
```

Render:
```tsx
{mode === 'zone' && liveArea && (
  <div data-testid="map-stats-bar">
    Perimeter: {liveArea.perimeterFt} ft • Area: ~{liveArea.areaSqFt} sq ft / {draftPoints.length} points
  </div>
)}
```

**Zone drawing controls** (bottom, replaces toolbar when in zone/wire mode):
```tsx
{(mode === 'zone' || mode === 'wire') && (
  <div data-testid="map-drawing-controls">
    <button data-testid="map-undo-point" onClick={undoLastPoint}>Undo Point</button>
    <button data-testid="map-finish-drawing" onClick={finishDrawing}>✓ Finish</button>
    <button data-testid="map-cancel-drawing" onClick={cancelDrawing}>Cancel</button>
  </div>
)}
```

**`finishDrawing`**:
- Zone: create a closed `Polygon` GeoJSON feature from `draftPoints`
- Wire: create a `LineString` GeoJSON feature
- Push to `features` (save to undo stack)
- Clear `draftPoints`, set `mode('idle')`
- Zone: set `selectedFeature` to the new polygon → opens Zone Info panel

**`undoLastPoint`**: pop last coord from `draftPoints`.

**Undo/Redo logic**:
- Before any mutation of `features`: push current `features` to `undoStack`, clear `redoStack`
- `undo()`: pop from `undoStack` → restore `features`, push current to `redoStack`
- `redo()`: pop from `redoStack` → restore `features`, push current to `undoStack`

---

## Phase 5 — Zone Info + Metadata panel

### `app/components/map/zone-info-panel.tsx` (new file)

Props:
```ts
interface ZoneInfoPanelProps {
  feature: GeoJSON.Feature<GeoJSON.Polygon>
  onUpdate: (updated: GeoJSON.Feature) => void
  onDuplicate: () => void
  onDelete: () => void
  onClose: () => void
}
```

State: local copy of all properties, dirty-flag.

UI sections (bottom sheet, scrollable):
1. **Header**: "Zone Info" | Duplicate | Edit | Done
2. **Zone size**: computed from `feature.geometry` using Turf (read-only)
3. **Zone Name**: text input + "Auto-name" button (auto-names "Zone 1", "Zone 2", incrementing)
4. **Fill opacity**: `<input type="range" min={0} max={100} step={5}>` — show `{value}%` label
5. **Color picker**:
   - Large circle showing current color
   - Row of recent project colors (derived from other features' colors)
   - Full palette row (8 preset colors)
   - Hex text input
6. **Zone Metadata** (green section header):
   - Polygon role pill group: Zone | Hydrozone | Irrigated | Exclusion
   - Area type pill group: Turf | Bed | Other
   - Sun exposure pill group: Sunny | Mixed | Shade
   - Grass type text input
7. **Photos**:
   - "Add" button → file input or camera
   - Upload via `uploadZonePhoto` action → store URL in feature properties
   - Thumbnail grid of uploaded photos
8. **Cancel | Delete**

On "Done": call `onUpdate` with merged properties.

GeoJSON feature properties shape (add to `types/index.ts`):
```ts
export interface ZoneFeatureProperties {
  featureType: 'zone'
  name: string
  color: string
  opacity: number          // 0–1
  role: 'zone' | 'hydrozone' | 'irrigated' | 'exclusion'
  areaType: 'turf' | 'bed' | 'other'
  sunExposure: 'sunny' | 'mixed' | 'shade'
  grassType: string
  photoUrls: string[]
  areaSqFt: number
  perimeterFt: number
}
```

---

## Phase 6 — Point placement

### `app/components/map/add-point-panel.tsx` (new file)

Bottom sheet shown after tapping map in point mode:
- "Add a Point / What kind of point are you adding?"
- 2×2 grid: **Heads** | **System Components** | **Repair** | **Other** | Cancel row

On selection → opens `ConfigurePointPanel`.

### `app/components/map/configure-point-panel.tsx` (new file)

Props: `pointType: string`, `coord: [number, number]`, `onConfirm: (feature) => void`, `onBack: () => void`

- Title: "Configure {pointType}"
- Name input (default: "Controller 1" / "Head 1" etc., auto-incrementing)
- Color row
- Back | ✓ Create

On Create: build a `Point` GeoJSON feature with properties `{ featureType: 'controller'|'head'|'repair'|'other', name, color }` at `coord` → call `onConfirm`.

Map renders controller points as labeled circles using Mapbox symbol layer or HTML markers.

---

## Phase 7 — Wire drawing

Wire mode works identically to zone mode but produces a `LineString` instead of a closed `Polygon`. No Zone Info panel after finishing — just saved directly. Wire properties: `{ featureType: 'wire', name: '', color: '#666' }`.

---

## Phase 8 — Review screen

### `app/components/map/review-panel.tsx` (new file)

Shown when "Review" button tapped:
- Feature count breakdown: N zones, N controllers, N heads, N wires
- Total irrigated area (sum of zone `areaSqFt`)
- List of zones with name, area, color swatch
- List of points with name, type
- Done button → back to map

---

## Constraints

- Multi-tenancy: all `actions/site-maps.ts` calls must use `getRequiredCompanyId()` and filter by `companyId`
- No `any` types
- No `console.log` in committed code
- `npm run build` must pass after each phase
- `npm test` must pass before reporting phase complete

---

## Commit format per phase

```
irrigation-map-ux (f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c): phase-{N} — {description}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## Telegram notifications

```bash
curl -s -X POST "https://api.telegram.org/bot8270857898:AAGFh1AsEvVfYJ4E2fdHwQJsu1vtGBsKv5s/sendmessage" \
  -d chat_id=8447110601 \
  -d "text=irrigation-map-ux phase-{N} ✅ Coding complete — build passes"
```
