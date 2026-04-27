# Coding Instructions: drawable-map

## Goal

Add a drawable satellite map panel to the Sites page. Users click "Map" on any site row, a right-side panel opens with a Mapbox satellite map and drawing controls (polygon, line, point, trash). Every draw/update/delete event auto-saves the GeoJSON to the backend. Drawings reload on next visit.

---

## Step 0 — Install dependencies

```bash
npm install mapbox-gl @mapbox/mapbox-gl-draw
npm install --save-dev @types/mapbox__mapbox-gl-draw
```

Note: `@types/mapbox-gl` may already be a transitive dep. If not: `npm install --save-dev @types/mapbox-gl`.

---

## Step 1 — Schema: add `site_drawings` table

**File**: `lib/schema.ts`

Add after the `siteBackflows` table definition:

```ts
export const siteDrawings = pgTable('site_drawings', {
  id:        uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  siteId:    uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  drawing:   jsonb('drawing').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdateFn(() => new Date()),
}, (table) => [
  unique('site_drawings_site_uniq').on(table.siteId),
])

export type SiteDrawing    = typeof siteDrawings.$inferSelect
export type NewSiteDrawing = typeof siteDrawings.$inferInsert
```

The `drawing` column stores a GeoJSON `FeatureCollection` object. Use `jsonb('drawing').notNull()` without a type annotation — GeoJSON is complex and the type can be refined later.

**After editing schema**, apply the migration:

```bash
npx drizzle-kit generate
DATABASE_URL=postgresql://localhost:5432/irrigation_test npx tsx scripts/migrate.ts
npm run test:db
```

Confirm all DB integration tests still pass before continuing.

---

## Step 2 — API Route: GET + POST `/api/sites/[siteId]/drawing`

**File**: `app/api/sites/[siteId]/drawing/route.ts` (new file — create the directory)

### GET handler

Returns the stored drawing for the site, or `null` if none exists.

```ts
import { NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sites, siteDrawings } from '@/lib/schema'
import { getRequiredCompanyId } from '@/lib/tenant'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const companyId = await getRequiredCompanyId()
  const { siteId } = await params

  // Verify site belongs to this company
  const site = await db.query.sites.findFirst({
    where: and(eq(sites.id, siteId), eq(sites.companyId, companyId)),
    columns: { id: true },
  })
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const row = await db.query.siteDrawings.findFirst({
    where: and(eq(siteDrawings.siteId, siteId), eq(siteDrawings.companyId, companyId)),
    columns: { drawing: true },
  })

  return NextResponse.json({ drawing: row?.drawing ?? null })
}
```

### POST handler

Upserts the drawing. Body is a raw GeoJSON FeatureCollection.

```ts
export async function POST(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const companyId = await getRequiredCompanyId()
  const { siteId } = await params

  // Verify site belongs to this company
  const site = await db.query.sites.findFirst({
    where: and(eq(sites.id, siteId), eq(sites.companyId, companyId)),
    columns: { id: true },
  })
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let drawing: unknown
  try {
    drawing = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Basic structural validation — must be a FeatureCollection
  if (
    typeof drawing !== 'object' ||
    drawing === null ||
    (drawing as Record<string, unknown>).type !== 'FeatureCollection'
  ) {
    return NextResponse.json({ error: 'Expected a GeoJSON FeatureCollection' }, { status: 400 })
  }

  await db
    .insert(siteDrawings)
    .values({ companyId, siteId, drawing })
    .onConflictDoUpdate({
      target: siteDrawings.siteId,
      set: { drawing, updatedAt: new Date() },
    })

  return NextResponse.json({ ok: true })
}
```

**Multi-tenancy invariant**: Both handlers call `getRequiredCompanyId()` first and include `companyId` in the site ownership check. Never accept `companyId` from the request body.

---

## Step 3 — Map component (dynamic, SSR-disabled)

Mapbox GL and MapboxDraw access `window`/`document` at import time. They must be wrapped in `next/dynamic` with `ssr: false`.

### `app/components/site-map-editor.tsx` (dynamic wrapper — the public export)

```tsx
'use client'

import dynamic from 'next/dynamic'

const SiteMapEditorInner = dynamic(
  () => import('./site-map-editor-inner').then(m => ({ default: m.SiteMapEditorInner })),
  { ssr: false, loading: () => <div style={{ color: '#a1a1aa', padding: 16 }}>Loading map…</div> },
)

interface SiteMapEditorProps {
  siteId: string
  siteName: string
  onClose: () => void
}

export function SiteMapEditor(props: SiteMapEditorProps) {
  return <SiteMapEditorInner {...props} />
}
```

### `app/components/site-map-editor-inner.tsx` (actual Mapbox component)

This file is only ever loaded client-side (via the dynamic import above).

Key responsibilities:
- Import Mapbox GL and MapboxDraw CSS at the top
- Initialize a `mapboxgl.Map` with satellite-streets style on mount
- Add a `MapboxDraw` control with polygon, line_string, point, and trash
- On `map.on('load')`: fetch the existing drawing via `GET /api/sites/[siteId]/drawing` and call `draw.add(data)` if a drawing exists
- On `draw.create`, `draw.update`, `draw.delete`: call `saveDrawing()` which POSTs `draw.getAll()` to `POST /api/sites/[siteId]/drawing`
- On unmount: remove map instance

```tsx
'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

interface SiteMapEditorInnerProps {
  siteId: string
  siteName: string
  onClose: () => void
}

export function SiteMapEditorInner({ siteId, siteName, onClose }: SiteMapEditorInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [-98.5795, 39.8283], // continental US center — map flies to site if geocoded later
      zoom: 3,
    })

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        line_string: true,
        point: true,
        trash: true,
      },
    })

    map.addControl(draw)
    mapRef.current = map
    drawRef.current = draw

    async function loadDrawing() {
      const res = await fetch(`/api/sites/${siteId}/drawing`)
      if (!res.ok) return
      const { drawing } = await res.json() as { drawing: unknown }
      if (drawing) draw.add(drawing as GeoJSON.FeatureCollection)
    }

    async function saveDrawing() {
      const data = draw.getAll()
      await fetch(`/api/sites/${siteId}/drawing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }

    map.on('load', loadDrawing)
    map.on('draw.create', saveDrawing)
    map.on('draw.update', saveDrawing)
    map.on('draw.delete', saveDrawing)

    return () => {
      map.remove()
    }
  }, [siteId])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Map — {siteName}</h3>
        <button className="btn btn-sm" onClick={onClose}>Close</button>
      </div>
      <div
        ref={containerRef}
        data-testid="site-map-container"
        style={{ width: '100%', height: 480, borderRadius: 8 }}
      />
    </div>
  )
}
```

**Important Next.js note**: CSS imports from `mapbox-gl` and `@mapbox/mapbox-gl-draw` inside a component file are fine in Next.js 15 App Router — they are bundled as global CSS. If the build complains, move them to `app/globals.css` with `@import 'mapbox-gl/dist/mapbox-gl.css'` etc.

---

## Step 4 — Extend `SitesTable` with a "Map" button

**File**: `app/sites/sites-table.tsx`

Add `onViewMap` callback to props and a "Map" button next to "Edit Equipment":

```ts
interface SitesTableProps {
  sites: SiteWithClient[]
  onEditEquipment: (siteId: string) => void
  onViewMap: (siteId: string) => void
}
```

In the row's `<td>`:

```tsx
<td style={{ display: 'flex', gap: 8 }}>
  <button
    className="btn btn-sm"
    data-testid="sites-table-edit-equipment"
    onClick={() => onEditEquipment(s.id)}
  >
    Edit Equipment
  </button>
  <button
    className="btn btn-sm"
    data-testid="sites-table-view-map"
    onClick={() => onViewMap(s.id)}
  >
    Map
  </button>
</td>
```

---

## Step 5 — Extend `SitesPageClient` panel state

**File**: `app/sites/sites-page-client.tsx`

Replace the single `selectedSiteId` state with a discriminated union `panelState`:

```ts
type PanelState =
  | { type: 'equipment'; siteId: string }
  | { type: 'map'; siteId: string }
  | null

const [panelState, setPanelState] = useState<PanelState>(null)
```

Update the derived `selectedSite`:

```ts
const activeSiteId = panelState?.siteId ?? null
const selectedSite = activeSiteId ? sites.find(s => s.id === activeSiteId) ?? null : null
```

Add handlers:

```ts
function handleEditEquipment(siteId: string) {
  setPanelState(prev =>
    prev?.type === 'equipment' && prev.siteId === siteId ? null : { type: 'equipment', siteId }
  )
}

function handleViewMap(siteId: string) {
  setPanelState(prev =>
    prev?.type === 'map' && prev.siteId === siteId ? null : { type: 'map', siteId }
  )
}

function handleClose() {
  setPanelState(null)
}
```

Update `SitesTable` call:

```tsx
<SitesTable
  sites={sites}
  onEditEquipment={handleEditEquipment}
  onViewMap={handleViewMap}
/>
```

Update panel rendering:

```tsx
{panelState !== null && selectedSite && (
  <section
    className="card"
    style={{ flex: '1 1 auto', minWidth: 0 }}
    data-testid="sites-page-editor-panel"
  >
    {panelState.type === 'equipment' && (
      <SiteEquipmentEditor
        key={selectedSite.id}
        site={selectedSite}
        onClose={handleClose}
        onSave={handleClose}
      />
    )}
    {panelState.type === 'map' && (
      <SiteMapEditor
        key={selectedSite.id}
        siteId={selectedSite.id}
        siteName={selectedSite.name}
        onClose={handleClose}
      />
    )}
  </section>
)}
```

Also update the layout width logic — replace the `selectedSite` condition with `panelState !== null`:

```tsx
style={{
  flex: panelState !== null ? '0 0 auto' : '1 1 auto',
  minWidth: 0,
  width: panelState !== null ? '55%' : '100%',
  transition: 'width 0.2s',
}}
```

---

## Step 6 — Environment variable

Add to `.env.local`:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiY...  ← real token here
```

The token must start with `pk.` (public access token from mapbox.com). This is safe to expose in the browser — it is a Mapbox public token, not a secret.

Also document in `README.md` or `.env.local.example` that this variable is required.

---

## Pre-commit checklist

Run in order before every commit:

```bash
npm run build    # must pass — catches TypeScript errors
npm test         # must pass — catches unit test regressions
npm run test:db  # must pass — confirms schema migration + queries work
```

If `npm run build` fails with a type error from the MapboxDraw CSS import, move the CSS imports to `app/globals.css` instead.

---

## Files Modified / Created

| File | Change |
|---|---|
| `lib/schema.ts` | Add `siteDrawings` table + types |
| `drizzle/XXXX_*.sql` | Generated migration (do not edit) |
| `app/api/sites/[siteId]/drawing/route.ts` | New — GET + POST handlers |
| `app/components/site-map-editor.tsx` | New — dynamic wrapper component |
| `app/components/site-map-editor-inner.tsx` | New — Mapbox + MapboxDraw component |
| `app/sites/sites-table.tsx` | Add `onViewMap` prop + "Map" button |
| `app/sites/sites-page-client.tsx` | Replace `selectedSiteId` with `panelState` discriminated union |

---

## Success Criteria

- [ ] `siteDrawings` table exists and migrates cleanly
- [ ] GET `/api/sites/[siteId]/drawing` returns `{ drawing: null }` for new sites
- [ ] POST `/api/sites/[siteId]/drawing` upserts GeoJSON and returns `{ ok: true }`
- [ ] 404 if `siteId` does not belong to the authenticated company (cross-tenant guard)
- [ ] "Map" button appears in every sites table row
- [ ] Clicking "Map" opens the satellite map panel
- [ ] Drawing controls (polygon, line, point, trash) are visible
- [ ] Drawing shapes triggers auto-save (no manual save button needed)
- [ ] Closing and reopening the map reloads the saved drawing
- [ ] Clicking "Map" again on the same site closes the panel (toggle)
- [ ] Equipment editor and Map panel are mutually exclusive (one at a time)
- [ ] `npm run build` passes with no TypeScript errors
- [ ] `npm test` passes
