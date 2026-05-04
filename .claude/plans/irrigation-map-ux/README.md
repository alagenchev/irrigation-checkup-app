# Task: irrigation-map-ux

**UUID**: `f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c`
**Status**: pending

## Source of Truth

Frames from `Pocket Irrigator` iOS app — analyzed from `/Users/alagenchev/Downloads/frames/`.

---

## What the Target UX Looks Like (frame-by-frame analysis)

### Screen 1 — Mapping Home (frame 1)
- "Mapping" title, "Start a new map project or open an existing property" subtitle
- **New project form**: address input + optional project label + "Start Drawing" button
- **Existing properties list**: address + city rows with `>` arrow

### Screen 2 — Property Maps List (frame 5)
- Property name in header ("1502 Duncan Perry Road")
- "Maps for this Property" section
- Each map card shows: name ("Main"), feature count ("5 features"), date ("Apr 24"), **Edit** | **Duplicate** | **...** buttons
- **"+ Create New Map"** button with dashed border

### Screen 3 — Create New Map dialog (frames 10, 15)
- Modal: name field (default "Main2"), "Start from:" radio — Empty map | Copy from existing
- Cancel / Create buttons

### Screen 4 — Map Canvas (frames 30, 33, 35)
- Full-screen Mapbox satellite map
- **Top bar**: ← back | map name | **Review** (blue) | **Exit** (red)
- **Left controls**: compass, North indicator, layers toggle
- **Bottom toolbar** (persistent): Undo | Redo | "All synced" | [tool icons row] | +/- zoom
- Tool icons in bottom bar (left to right): point/pin, line, zone/polygon, wire/pencil, (more)
- Active mode shown as a pill tag top-left (e.g., "Drawing Zone ✕", "Drawing Wire ✕")

### Screen 5 — Add a Point (frames 22, 20)
- Tapping the point tool shows bottom sheet: "Add a Point / What kind of point are you adding?"
- 2×2 grid of options: **Heads** | **System Components** | **Repair** | **Other** + Cancel
- Selecting "System Components" → sub-sheet: Controller / Backflow / etc.

### Screen 6 — Configure Controller (frame 25)
- Bottom sheet: "Configure Controller / Set the details for this point"
- Name field ("Controller 1")
- Color row (colored circles)
- Back | ✓ Create buttons
- After creation: labeled dot appears on map ("Controller 1")

### Screen 7 — Zone Drawing mode (frames 40, 45, 50)
- Active tag "Drawing Zone ✕" in top left
- User taps to place points — green dots connected by dashed lines
- **Live bottom bar during drawing**:
  - "Undo Point" (left)
  - "✓ Finish" (center, white pill)
  - "Cancel" (right, pink/red pill)
- **Live stats bar** above toolbar: "Perimeter: 232 ft • Area: ~3193 sq ft / 5 points"
- As points added, stats update in real time

### Screen 8 — Drawing Wire mode (frame 33)
- Active tag "Drawing Wire ✕" in top left — for routing pipes/wires on the map

### Screen 9 — Zone Info panel (frames 55, 58, 60)
- Bottom sheet slides up after tapping ✓ Finish
- Header row: **Duplicate** | **Edit** | **Done**
- **Zone size**: "~2240 sq ft" (read-only computed)
- **Zone Name** text input + **Auto-name** button
- **Fill opacity** slider (0–100%, default 25%), percentage shown below
- **Give it some color**: large color circle showing current, then recent project colors row, then full palette row
- Hex color input field (e.g., "#3B7D3A")

### Screen 10 — Zone Metadata (frames 65, 70, 75)
- Scrolled down in same zone bottom sheet:
- **Zone Metadata** section header (green)
- **Polygon role** pill group: Zone | Hydrozone | Irrigated | Exclusion
- **Area type** pill group: Turf | Bed | Other
- **Sun exposure** pill group: Sunny | Mixed | Shade
- **Grass type (optional)** text input (e.g., "Bermuda")
- **Photos** section: "Add" button (top right), empty state "No photos yet / Tap 'Add' to upload photos"
- After photo taken: thumbnail shown, count badge "Photos 1"
- Bottom: **Cancel** | **Delete** (red) buttons

---

## Gap Analysis vs Current Implementation

| Feature | Current | Target |
|---|---|---|
| Maps per site | 1 (single drawing) | Multiple named maps per site |
| Drawing UI | Mapbox Draw raw toolbar | Custom semantic toolbar + mode tags |
| Zone drawing | Mapbox polygon tool | Point-by-point with live area/perimeter + Undo Point / Finish / Cancel |
| Wire drawing | Mapbox line tool | Dedicated "Drawing Wire" mode |
| Point placement | Mapbox point tool | Type selection sheet (Heads / System Components / Repair / Other) |
| Controller points | Not supported | Configure name + color, labeled on map |
| Zone metadata | None | Name, opacity, color, role, area type, sun exposure, grass type |
| Photos per zone | Not supported | Camera/upload per zone polygon |
| Undo/Redo | Mapbox Draw built-in | Custom Undo/Redo stack |
| Sync status | None | "All synced" indicator |
| Review screen | None | Summary of all map features |

---

## Implementation Phases

### Phase 1 — Schema: Multiple maps per site
- Add `site_maps` table: `id uuid PK`, `siteId uuid FK`, `companyId uuid FK`, `name text`, `drawing jsonb`, `createdAt timestamp`
- Migrate existing `site_drawings` data into `site_maps` (as "Main" map)
- New API: `GET /api/sites/[siteId]/maps` → list of maps, `POST /api/sites/[siteId]/maps` → create, `PUT /api/sites/[siteId]/maps/[mapId]` → save drawing, `DELETE /api/sites/[siteId]/maps/[mapId]`

### Phase 2 — Maps list UI (Sites page)
- Replace single "Map" button with "Maps" button
- "Maps for this Property" panel: list of map cards (name, feature count, date) + Edit | Duplicate | ... actions
- "+ Create New Map" button with modal (name + empty/copy radio)

### Phase 3 — Custom drawing toolbar
- Remove Mapbox Draw default controls
- Bottom toolbar: Undo | Redo | sync status | tool buttons (Point, Zone, Wire) | zoom
- Mode pill tag (top left) shows active mode with ✕ dismiss

### Phase 4 — Zone drawing mode
- Point-by-point polygon: tap to place green dots, dashed preview lines
- Live stats bar: perimeter (ft) + area (sq ft) + point count — computed from Turf.js
- Undo Point / ✓ Finish / Cancel controls
- On Finish → Zone Info bottom sheet

### Phase 5 — Zone Info + Metadata panel
- Zone size (auto-computed, read-only)
- Zone Name input + Auto-name button (auto-names as "Zone 1", "Zone 2", etc.)
- Fill opacity slider (0–100%)
- Color picker: recent project colors + full palette + hex input
- Zone Metadata: polygon role pills, area type pills, sun exposure pills, grass type input
- Photos: Add button → camera/upload, thumbnail grid
- Cancel | Delete

### Phase 6 — Point placement
- Tap point tool → "Add a Point" bottom sheet: Heads | System Components | Repair | Other
- System Components → Controller → Configure (name + color) → labeled dot on map
- Other point types: simple pin with type label

### Phase 7 — Wire drawing mode
- Line-string point-by-point mode similar to zone but without closed polygon
- Undo Point / ✓ Finish / Cancel

### Phase 8 — Review screen
- Summary of all features on the map (zones, points, wires)
- Feature count, total irrigated area, etc.

---

## Data Model for GeoJSON Properties

Each feature in the GeoJSON FeatureCollection carries properties:

```ts
// Zone polygon
{
  featureType: 'zone',
  name: 'Zone 1 front yard',
  color: '#3B7D3A',
  opacity: 0.25,
  role: 'zone' | 'hydrozone' | 'irrigated' | 'exclusion',
  areaType: 'turf' | 'bed' | 'other',
  sunExposure: 'sunny' | 'mixed' | 'shade',
  grassType: string,
  photoUrls: string[],
  areaSqFt: number,   // computed, stored for display
  perimeterFt: number,
}

// Point
{
  featureType: 'head' | 'controller' | 'repair' | 'other',
  name: string,
  color: string,
}

// Wire
{
  featureType: 'wire',
  name: string,
  color: string,
}
```

---

## Tech Stack Notes

- **Turf.js** (`@turf/turf`) for area + perimeter calculations — install if not present
- **Mapbox GL JS** stays for the satellite base map — remove `MapboxDraw` plugin entirely
- Custom drawing logic via map click handlers + React state
- Bottom sheets: slide-up panels using existing CSS or simple absolute positioning
- Color picker: simple palette grid + hex input — no third-party lib needed
- Photos: reuse existing `uploadZonePhoto` action from `actions/upload.ts`

---

## Files to Create/Modify

**New files:**
- `app/components/map/map-canvas.tsx` — full rewrite of the map editor
- `app/components/map/zone-info-panel.tsx` — Zone Info + Metadata bottom sheet
- `app/components/map/add-point-panel.tsx` — point type selection sheet
- `app/components/map/configure-point-panel.tsx` — controller/head config sheet
- `app/components/map/drawing-toolbar.tsx` — bottom toolbar
- `app/components/map/map-stats-bar.tsx` — live perimeter/area display
- `app/components/map/maps-list-panel.tsx` — maps list for a site
- `lib/map-utils.ts` — area/perimeter calculation helpers (Turf wrappers)
- `actions/site-maps.ts` — server actions for CRUD on site_maps

**Modified files:**
- `lib/schema.ts` — add `site_maps` table
- `lib/validators.ts` — Zod schemas for map creation
- `app/sites/sites-page-client.tsx` — update panel state for new maps flow
- `app/sites/sites-table.tsx` — "Maps" button (was "Map")
- `app/components/site-map-editor.tsx` — replace with new MapCanvas
- `app/components/site-map-editor-inner.tsx` — replace with new implementation

**Migration:**
- `drizzle/` — new migration for `site_maps` table
- `scripts/migrate-site-drawings.ts` — one-time migration of existing drawings

---

## Dependencies to Add

```bash
npm install @turf/turf
npm install @types/geojson  # if not already present
```
