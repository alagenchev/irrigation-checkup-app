# Unit Tests — irrigation-map-ux

**UUID**: `f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c`
**Agent**: Testing Agent
**Read first**: `coding.md` and `README.md`

---

## Mocking strategy

All Mapbox GL and Turf imports must be mocked in tests. Add to `jest.setup.ts` or individual test files:

```ts
jest.mock('mapbox-gl', () => ({
  Map: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    addControl: jest.fn(),
    remove: jest.fn(),
    addSource: jest.fn(),
    addLayer: jest.fn(),
    getSource: jest.fn().mockReturnValue({ setData: jest.fn() }),
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
  })),
  NavigationControl: jest.fn(),
}))

jest.mock('@turf/turf', () => ({
  polygon: jest.fn(coords => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: coords } })),
  lineString: jest.fn(coords => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } })),
  area: jest.fn().mockReturnValue(929),     // ~10,000 sq ft
  length: jest.fn().mockReturnValue(100),   // 100 ft
}))
```

Mock `actions/site-maps.ts` in all component tests.

---

## Phase 1 — Server Actions (unit tests)

File: `__tests__/site-maps.test.ts`

Mock `lib/db`, `lib/tenant`.

```
describe('getSiteMaps')
  it('returns maps filtered by companyId and siteId')
  it('throws if no company context')

describe('createSiteMap')
  it('inserts with correct companyId and siteId')
  it('defaults name to provided value')

describe('saveSiteMapDrawing')
  it('updates drawing and updatedAt for the correct companyId')
  it('does not update rows belonging to other companies')

describe('deleteSiteMap')
  it('deletes only maps matching mapId AND companyId')

describe('duplicateSiteMap')
  it('creates a new row copying drawing from original')
  it('throws if original map not found or wrong company')
```

---

## Phase 2 — MapsListPanel (unit tests)

File: `__tests__/maps-list-panel.test.tsx`

```
describe('MapsListPanel')
  it('renders list of maps with name, feature count, and date')
  it('shows "No maps yet" when list is empty')
  it('calls onEditMap with correct mapId when Edit clicked')
  it('opens CreateMapModal when "+ Create New Map" clicked')
  it('calls duplicateSiteMap when Duplicate clicked')
  it('calls deleteSiteMap when Delete confirmed')
  it('calls onClose when Close clicked')

describe('CreateMapModal')
  it('renders name input with default value')
  it('shows "Copy from existing" option only when maps exist')
  it('calls createSiteMap with name on Create click')
  it('calls onCreated with new map id after creation')
  it('Cancel dismisses modal without creating')
```

---

## Phase 3 — DrawingToolbar (unit tests)

File: `__tests__/drawing-toolbar.test.tsx`

```
describe('DrawingToolbar')
  it('renders Undo, Redo, tool buttons, and zoom controls')
  it('Undo button is disabled when undoStack is empty')
  it('Redo button is disabled when redoStack is empty')
  it('shows "All synced" when isSynced=true')
  it('shows "Saving…" when isSynced=false')
  it('calls setMode("zone") when zone tool clicked')
  it('calls setMode("wire") when wire tool clicked')
  it('calls setMode("point") when point tool clicked')

describe('Mode tag')
  it('shows "Drawing Zone ✕" when mode=zone')
  it('shows "Drawing Wire ✕" when mode=wire')
  it('shows "Adding Point ✕" when mode=point')
  it('not rendered when mode=idle')
  it('clicking ✕ resets mode to idle and clears draftPoints')
```

---

## Phase 4 — Zone drawing logic (unit tests)

File: `__tests__/map-canvas-drawing.test.ts` (pure logic, no DOM)

Extract drawing logic into `lib/map-utils.ts` pure functions:

```ts
// lib/map-utils.ts
export function computeZoneStats(points: [number, number][])
  : { areaSqFt: number; perimeterFt: number } | null

export function buildZoneFeature(
  points: [number, number][],
  properties: Partial<ZoneFeatureProperties>
): GeoJSON.Feature<GeoJSON.Polygon>

export function buildWireFeature(
  points: [number, number][]
): GeoJSON.Feature<GeoJSON.LineString>

export function autoName(existingFeatures: GeoJSON.Feature[], type: 'zone' | 'controller' | 'head'): string
```

Tests:
```
describe('computeZoneStats')
  it('returns null when fewer than 3 points')
  it('returns areaSqFt and perimeterFt for a valid polygon')
  it('area is positive regardless of point winding order')

describe('buildZoneFeature')
  it('closes the polygon (first coord repeated at end)')
  it('merges provided properties with featureType=zone')

describe('buildWireFeature')
  it('produces a LineString feature')

describe('autoName')
  it('returns "Zone 1" when no zones exist')
  it('returns "Zone 3" when Zone 1 and Zone 2 exist')
  it('returns "Controller 1" for controller type')
```

---

## Phase 5 — ZoneInfoPanel (unit tests)

File: `__tests__/zone-info-panel.test.tsx`

```
describe('ZoneInfoPanel')
  it('displays computed zone size in sq ft')
  it('renders Zone Name input with feature name')
  it('Auto-name button sets name to next sequential zone name')
  it('Fill opacity slider updates displayed percentage')
  it('selecting a preset color updates the hex input')
  it('typing a hex value updates the color preview')
  it('polygon role pill group — selecting Hydrozone deselects Zone')
  it('area type pill group — selecting Bed deselects Turf')
  it('sun exposure pill group — selecting Shade deselects Mixed')
  it('grass type input accepts text')
  it('Add photo button triggers file input')
  it('Done calls onUpdate with merged properties')
  it('Cancel calls onClose without updating')
  it('Delete calls onDelete')
  it('Duplicate calls onDuplicate')
```

---

## Phase 6 — AddPointPanel + ConfigurePointPanel (unit tests)

File: `__tests__/add-point-panel.test.tsx`

```
describe('AddPointPanel')
  it('renders Heads, System Components, Repair, Other options')
  it('Cancel calls onClose')
  it('selecting Heads shows ConfigurePointPanel with type=head')
  it('selecting System Components shows sub-menu with Controller option')

describe('ConfigurePointPanel')
  it('renders name input with default auto-name')
  it('color selection updates preview')
  it('Create calls onConfirm with a Point GeoJSON feature at correct coords')
  it('feature properties include featureType, name, color')
  it('Back calls onBack without confirming')
```

---

## Phase 7 — Wire drawing (unit tests)

Tests added to `__tests__/map-canvas-drawing.test.ts`:
```
describe('wire drawing')
  it('produces LineString (not Polygon) feature')
  it('does not open ZoneInfoPanel after finishing wire')
  it('Undo Point removes last wire coordinate')
```

---

## Phase 8 — ReviewPanel (unit tests)

File: `__tests__/review-panel.test.tsx`

```
describe('ReviewPanel')
  it('shows zone count')
  it('shows controller/head/point counts')
  it('shows total irrigated area summed from all zone features')
  it('lists zones with name and area')
  it('Done calls onClose')
```

---

## Coverage target

≥ 90% on all new files in `app/components/map/`, `lib/map-utils.ts`, `actions/site-maps.ts`.

```bash
npm test -- --coverage --testPathPattern="site-maps|maps-list|drawing-toolbar|map-canvas|zone-info|add-point|configure-point|review-panel|map-utils"
```

---

## Commit format

```
irrigation-map-ux (f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c): unit-tests phase-{N} — {description}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
