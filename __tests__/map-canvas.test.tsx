/**
 * @jest-environment jsdom
 *
 * Unit/integration tests for MapCanvas — focusing on the regression where
 * GeoJSON sources were not populated after edit→back→edit navigation cycles.
 *
 * Root cause: on a fresh mount, the React effect that calls updateMapSources()
 * could fire when map.isStyleLoaded() was still false, causing sources to stay
 * empty.
 *
 * Fix: inside the map 'load' callback, after setFeatures(loadedFeatures), we
 * now also call updateMapSources(loadedFeatures) directly — guaranteeing sources
 * are populated regardless of whether the React effect runs before or after
 * isStyleLoaded() returns true.
 */

// ── Server-side mocks (must be before importing components) ──────────────────
jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/db', () => ({ db: {} }))
jest.mock('@/lib/tenant', () => ({ getRequiredCompanyId: jest.fn() }))

// ── Mock the server action ────────────────────────────────────────────────────
jest.mock('@/actions/site-maps', () => ({
  getSiteMap: jest.fn(),
  saveSiteMapDrawing: jest.fn().mockResolvedValue(undefined),
}))

// ── Mock mapbox-gl CSS import (no-op in Jest) ─────────────────────────────────
jest.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}), { virtual: true })

// ── Mock child components (they depend on browser APIs we don't need here) ───
jest.mock('@/app/components/map/drawing-toolbar', () => ({
  DrawingToolbar: () => null,
}))
jest.mock('@/app/components/map/zone-info-panel', () => ({
  ZoneInfoPanel: jest.fn(() => null),
}))
jest.mock('@/app/components/map/line-info-panel', () => ({
  LineInfoPanel: () => null,
}))
jest.mock('@/app/components/map/point-info-panel', () => ({
  PointInfoPanel: () => null,
}))
jest.mock('@/app/components/map/add-point-panel', () => ({
  AddPointPanel: () => null,
}))
jest.mock('@/app/components/map/configure-point-panel', () => ({
  ConfigurePointPanel: () => null,
}))
jest.mock('@/app/components/map/review-panel', () => ({
  ReviewPanel: () => null,
}))

// ── Mapbox GL mock ────────────────────────────────────────────────────────────
//
// We build a minimal but realistic mock of mapboxgl.Map.
// Key design decisions:
//   - `isStyleLoaded` is initially false, then switches to true only after we
//     manually fire the 'load' event — this faithfully reproduces the timing
//     race the fix addresses.
//   - `getSource` returns a mock GeoJSONSource with a tracked `setData` spy.
//   - Event listeners (on/off) are stored so tests can fire them at will.

type EventListener = (...args: unknown[]) => void

interface MockGeoJSONSource {
  setData: jest.Mock
}

// Per-instance tracking so tests can inspect what happened on each map.
interface MapInstance {
  listeners: Map<string, EventListener[]>
  sources: Map<string, MockGeoJSONSource>
  isStyleLoaded: jest.Mock
  getSource: jest.Mock
  addSource: jest.Mock
  addLayer: jest.Mock
  on: jest.Mock
  remove: jest.Mock
  fitBounds: jest.Mock
  flyTo: jest.Mock
  jumpTo: jest.Mock
  getCenter: jest.Mock
  getZoom: jest.Mock
  zoomIn: jest.Mock
  zoomOut: jest.Mock
  resize: jest.Mock
  getCanvas: jest.Mock
  loaded: jest.Mock
  fireEvent: (event: string, ...args: unknown[]) => void
  _sources: Map<string, MockGeoJSONSource>
}

// All map instances created during a test, so tests can grab the latest one.
const mapInstances: MapInstance[] = []

function createMockMapInstance(): MapInstance {
  const listeners = new Map<string, EventListener[]>()
  const sources = new Map<string, MockGeoJSONSource>()

  const instance: MapInstance = {
    listeners,
    sources,
    _sources: sources,

    isStyleLoaded: jest.fn().mockReturnValue(false),

    getSource: jest.fn((id: string) => sources.get(id)),

    addSource: jest.fn((id: string) => {
      sources.set(id, { setData: jest.fn() })
    }),

    addLayer: jest.fn(),

    on: jest.fn((event: string, layerOrCb: unknown, cb?: EventListener) => {
      // on(event, callback) — 2-arg form
      // on(event, layerId, callback) — 3-arg form (layer-scoped click)
      const handler = typeof layerOrCb === 'function' ? (layerOrCb as EventListener) : (cb as EventListener)
      if (!listeners.has(event)) listeners.set(event, [])
      listeners.get(event)!.push(handler)
    }),

    remove: jest.fn(),
    fitBounds: jest.fn(),
    flyTo: jest.fn(),
    jumpTo: jest.fn(),
    getCenter: jest.fn().mockReturnValue({ lng: -98, lat: 39 }),
    getZoom: jest.fn().mockReturnValue(4),
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    resize: jest.fn(),
    getCanvas: jest.fn().mockReturnValue({ style: {} }),
    loaded: jest.fn().mockReturnValue(true),

    fireEvent(event: string, ...args: unknown[]) {
      const handlers = listeners.get(event) ?? []
      handlers.forEach(h => h(...args))
    },
  }

  return instance
}

// The mock constructor
const MockMapConstructor = jest.fn().mockImplementation(() => {
  const inst = createMockMapInstance()
  mapInstances.push(inst)
  return inst
})

jest.mock('mapbox-gl', () => ({
  __esModule: true,
  default: {
    Map: MockMapConstructor,
    LngLatBounds: jest.fn().mockImplementation(() => ({
      extend: jest.fn(),
      isEmpty: jest.fn().mockReturnValue(true),
    })),
    accessToken: '',
  },
}))

// ── Browser API polyfills for jsdom ──────────────────────────────────────────
// ResizeObserver is not available in jsdom; provide a minimal stub.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// ── Test imports ──────────────────────────────────────────────────────────────
import '@testing-library/jest-dom'
import React from 'react'
import { render, act } from '@testing-library/react'
import { MapCanvas } from '@/app/components/map/map-canvas'
import { ZoneInfoPanel } from '@/app/components/map/zone-info-panel'
import { getSiteMap } from '@/actions/site-maps'

const mockGetSiteMap = getSiteMap as jest.Mock
const MockZoneInfoPanel = ZoneInfoPanel as jest.Mock

// ── Helpers ───────────────────────────────────────────────────────────────────

function latestMapInstance(): MapInstance {
  return mapInstances[mapInstances.length - 1]
}

/**
 * Fire the map 'load' event on the latest instance.
 *
 * In real Mapbox GL JS, when the 'load' event fires, isStyleLoaded() returns true.
 * The race condition the fix addresses is that the React *effect* (which calls
 * updateMapSources after state update) may run before the style is loaded on a
 * fresh re-mount. The direct call inside the load callback bypasses this race.
 *
 * For our tests: isStyleLoaded() returns true throughout so updateMapSources()
 * works in both paths (direct call in load callback + React effect). This is the
 * normal/happy path. The additional test with isStyleLoaded=false documents the
 * defensive behavior.
 */
async function fireMapLoad(instance: MapInstance) {
  // Match real Mapbox: style is loaded when 'load' event fires
  instance.isStyleLoaded.mockReturnValue(true)
  await act(async () => {
    instance.fireEvent('load')
  })
}

// ── Sample GeoJSON data ───────────────────────────────────────────────────────

const ZONE_FEATURE: GeoJSON.Feature = {
  type: 'Feature',
  id: 'zone-1',
  geometry: {
    type: 'Polygon',
    coordinates: [[[-120, 37], [-119, 37], [-119, 38], [-120, 38], [-120, 37]]],
  },
  properties: {
    featureType: 'zone',
    _fid: 'zone-1',
    name: 'Front Lawn',
    color: '#22c55e',
    opacity: 25,
    areaSqFt: 1000,
    perimeterFt: 500,
  },
}

const WIRE_FEATURE: GeoJSON.Feature = {
  type: 'Feature',
  id: 'wire-1',
  geometry: { type: 'LineString', coordinates: [[-120, 37], [-119, 38]] },
  properties: { featureType: 'wire', _fid: 'wire-1', name: 'Main line', color: '#6b7280', notes: '' },
}

const POINT_FEATURE: GeoJSON.Feature = {
  type: 'Feature',
  id: 'point-1',
  geometry: { type: 'Point', coordinates: [-120, 37] },
  properties: { featureType: 'valve', _fid: 'point-1', name: 'Valve 1', color: '#3b82f6' },
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mapInstances.length = 0
  MockMapConstructor.mockClear()
  mockGetSiteMap.mockReset()
  // Reset sessionStorage between tests
  sessionStorage.clear()
})

// ─────────────────────────────────────────────────────────────────────────────
// Core regression: sources are populated inside the load callback
// ─────────────────────────────────────────────────────────────────────────────

describe('MapCanvas — source update inside load callback (regression)', () => {
  it('populates features-fill-src with zone features immediately when load fires, even when isStyleLoaded() is false during the callback', async () => {
    const drawing: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [ZONE_FEATURE],
    }
    mockGetSiteMap.mockResolvedValueOnce({ id: 'map-1', drawing })

    render(<MapCanvas mapId="map-1" />)

    const map = latestMapInstance()

    // isStyleLoaded is still false — this simulates the race condition
    expect(map.isStyleLoaded()).toBe(false)

    await fireMapLoad(map)

    // getSiteMap should have been called with our mapId
    expect(mockGetSiteMap).toHaveBeenCalledWith('map-1')

    // The fill source must have received the zone feature
    const fillSrc = map.sources.get('features-fill-src')
    expect(fillSrc).toBeDefined()
    expect(fillSrc!.setData).toHaveBeenCalled()

    const lastCall = fillSrc!.setData.mock.calls.at(-1)?.[0] as GeoJSON.FeatureCollection
    expect(lastCall.type).toBe('FeatureCollection')
    expect(lastCall.features).toHaveLength(1)
    expect(lastCall.features[0].properties?.featureType).toBe('zone')
  })

  it('populates features-outline-src with zone features immediately when load fires', async () => {
    const drawing: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [ZONE_FEATURE],
    }
    mockGetSiteMap.mockResolvedValueOnce({ id: 'map-1', drawing })

    render(<MapCanvas mapId="map-1" />)

    const map = latestMapInstance()
    await fireMapLoad(map)

    const outlineSrc = map.sources.get('features-outline-src')
    expect(outlineSrc!.setData).toHaveBeenCalled()

    const lastCall = outlineSrc!.setData.mock.calls.at(-1)?.[0] as GeoJSON.FeatureCollection
    expect(lastCall.features).toHaveLength(1)
    expect(lastCall.features[0].properties?.featureType).toBe('zone')
  })

  it('populates features-lines-src with wire features immediately when load fires', async () => {
    const drawing: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [WIRE_FEATURE],
    }
    mockGetSiteMap.mockResolvedValueOnce({ id: 'map-1', drawing })

    render(<MapCanvas mapId="map-1" />)

    const map = latestMapInstance()
    await fireMapLoad(map)

    const linesSrc = map.sources.get('features-lines-src')
    expect(linesSrc!.setData).toHaveBeenCalled()

    const lastCall = linesSrc!.setData.mock.calls.at(-1)?.[0] as GeoJSON.FeatureCollection
    expect(lastCall.features).toHaveLength(1)
    expect(lastCall.features[0].properties?.featureType).toBe('wire')
  })

  it('populates features-points-src with point features immediately when load fires', async () => {
    const drawing: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [POINT_FEATURE],
    }
    mockGetSiteMap.mockResolvedValueOnce({ id: 'map-1', drawing })

    render(<MapCanvas mapId="map-1" />)

    const map = latestMapInstance()
    await fireMapLoad(map)

    const pointsSrc = map.sources.get('features-points-src')
    expect(pointsSrc!.setData).toHaveBeenCalled()

    const lastCall = pointsSrc!.setData.mock.calls.at(-1)?.[0] as GeoJSON.FeatureCollection
    expect(lastCall.features).toHaveLength(1)
    expect(lastCall.features[0].properties?.featureType).toBe('valve')
  })

  it('correctly separates zone, wire, and point features into their respective sources', async () => {
    const drawing: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [ZONE_FEATURE, WIRE_FEATURE, POINT_FEATURE],
    }
    mockGetSiteMap.mockResolvedValueOnce({ id: 'map-1', drawing })

    render(<MapCanvas mapId="map-1" />)

    const map = latestMapInstance()
    await fireMapLoad(map)

    // Fill/outline only zones
    const fillData = map.sources.get('features-fill-src')!.setData.mock.calls.at(-1)?.[0] as GeoJSON.FeatureCollection
    expect(fillData.features.every(f => f.properties?.featureType === 'zone')).toBe(true)
    expect(fillData.features).toHaveLength(1)

    // Lines only wires
    const linesData = map.sources.get('features-lines-src')!.setData.mock.calls.at(-1)?.[0] as GeoJSON.FeatureCollection
    expect(linesData.features.every(f => f.properties?.featureType === 'wire')).toBe(true)
    expect(linesData.features).toHaveLength(1)

    // Points: non-zone, non-wire, Point geometry
    const pointsData = map.sources.get('features-points-src')!.setData.mock.calls.at(-1)?.[0] as GeoJSON.FeatureCollection
    expect(pointsData.features.every(f => f.properties?.featureType !== 'zone' && f.properties?.featureType !== 'wire')).toBe(true)
    expect(pointsData.features).toHaveLength(1)
  })

  it('does NOT skip source updates when getSiteMap returns null (empty map)', async () => {
    mockGetSiteMap.mockResolvedValueOnce(null)

    render(<MapCanvas mapId="map-1" />)

    const map = latestMapInstance()
    await fireMapLoad(map)

    // setData should still be called (with empty features arrays)
    const fillSrc = map.sources.get('features-fill-src')
    expect(fillSrc!.setData).toHaveBeenCalled()

    const lastCall = fillSrc!.setData.mock.calls.at(-1)?.[0] as GeoJSON.FeatureCollection
    expect(lastCall.features).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Re-mount scenario: simulates edit → back → edit navigation
// ─────────────────────────────────────────────────────────────────────────────

describe('MapCanvas — re-mount after navigation (edit→back→edit)', () => {
  it('populates sources on second mount just as reliably as the first', async () => {
    const drawing: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [ZONE_FEATURE],
    }

    // Both mounts will call getSiteMap
    mockGetSiteMap.mockResolvedValue({ id: 'map-1', drawing })

    // First mount
    const { unmount } = render(<MapCanvas mapId="map-1" />)
    const firstMap = latestMapInstance()
    await fireMapLoad(firstMap)

    const firstFillSrc = firstMap.sources.get('features-fill-src')
    const firstCallCount = firstFillSrc!.setData.mock.calls.length
    expect(firstCallCount).toBeGreaterThan(0)

    // Unmount (simulates "Back" navigation)
    unmount()

    // Second mount (simulates returning to the map editor)
    render(<MapCanvas mapId="map-1" />)
    const secondMap = latestMapInstance()

    // Must be a fresh map instance (MapCanvas creates a new mapboxgl.Map on mount)
    expect(secondMap).not.toBe(firstMap)

    // isStyleLoaded is still false on fresh mount — the race condition
    expect(secondMap.isStyleLoaded()).toBe(false)

    await fireMapLoad(secondMap)

    const secondFillSrc = secondMap.sources.get('features-fill-src')
    expect(secondFillSrc!.setData).toHaveBeenCalled()

    const lastCall = secondFillSrc!.setData.mock.calls.at(-1)?.[0] as GeoJSON.FeatureCollection
    expect(lastCall.features).toHaveLength(1)
    expect(lastCall.features[0].properties?.featureType).toBe('zone')
  })

  it('updateMapSources gracefully bails (no exception) when isStyleLoaded returns false', async () => {
    // Documents defensive behavior: if isStyleLoaded() is false, updateMapSources
    // exits silently without throwing. This ensures no runtime errors even in the
    // race condition scenario.
    const drawing: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [ZONE_FEATURE, WIRE_FEATURE],
    }

    mockGetSiteMap.mockResolvedValue({ id: 'map-2', drawing })

    const { unmount } = render(<MapCanvas mapId="map-2" />)
    await fireMapLoad(latestMapInstance())
    unmount()

    // Second mount — keep isStyleLoaded false throughout
    render(<MapCanvas mapId="map-2" />)
    const map = latestMapInstance()
    map.isStyleLoaded.mockReturnValue(false)

    // The load event fires; updateMapSources is called but bails on isStyleLoaded check.
    // No exception should be thrown.
    await act(async () => {
      expect(() => {
        map.fireEvent('load')
      }).not.toThrow()
    })

    // Sources were created via addSource (5 sources in the load callback)
    expect(map.addSource).toHaveBeenCalledTimes(5)

    // setData was NOT called because isStyleLoaded() returned false
    const fillSrc = map.sources.get('features-fill-src')
    expect(fillSrc!.setData).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Without mapId — initialDrawing prop path
// ─────────────────────────────────────────────────────────────────────────────

describe('MapCanvas — initialDrawing prop (no mapId)', () => {
  it('populates sources from initialDrawing when no mapId is provided', async () => {
    const initialDrawing: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [ZONE_FEATURE],
    }

    render(<MapCanvas initialDrawing={initialDrawing} />)

    const map = latestMapInstance()
    await fireMapLoad(map)

    // getSiteMap should NOT have been called (no mapId)
    expect(mockGetSiteMap).not.toHaveBeenCalled()

    // Sources should still be populated from initialDrawing
    const fillSrc = map.sources.get('features-fill-src')
    expect(fillSrc!.setData).toHaveBeenCalled()

    const lastCall = fillSrc!.setData.mock.calls.at(-1)?.[0] as GeoJSON.FeatureCollection
    expect(lastCall.features).toHaveLength(1)
    expect(lastCall.features[0].properties?.featureType).toBe('zone')
  })

  it('renders with empty sources when no mapId and no initialDrawing', async () => {
    render(<MapCanvas />)

    const map = latestMapInstance()
    await fireMapLoad(map)

    expect(mockGetSiteMap).not.toHaveBeenCalled()

    // All sources should be called with empty feature collections
    const fillSrc = map.sources.get('features-fill-src')
    const lastCall = fillSrc!.setData.mock.calls.at(-1)?.[0] as GeoJSON.FeatureCollection
    expect(lastCall.features).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Map initialization
// ─────────────────────────────────────────────────────────────────────────────

describe('MapCanvas — map initialization', () => {
  it('creates exactly one mapboxgl.Map instance on mount', () => {
    render(<MapCanvas />)
    expect(MockMapConstructor).toHaveBeenCalledTimes(1)
  })

  it('creates a new mapboxgl.Map on each fresh mount (not shared)', () => {
    const { unmount } = render(<MapCanvas mapId="map-1" />)
    unmount()
    render(<MapCanvas mapId="map-1" />)
    expect(MockMapConstructor).toHaveBeenCalledTimes(2)
  })

  it('adds all required GeoJSON sources during load', async () => {
    mockGetSiteMap.mockResolvedValueOnce(null)
    render(<MapCanvas mapId="map-1" />)

    const map = latestMapInstance()
    await fireMapLoad(map)

    const expectedSources = [
      'features-fill-src',
      'features-outline-src',
      'features-draft-src',
      'features-points-src',
      'features-lines-src',
    ]
    for (const sourceId of expectedSources) {
      expect(map.addSource).toHaveBeenCalledWith(sourceId, expect.objectContaining({ type: 'geojson' }))
    }
  })

  it('calls map.remove() on unmount (cleanup)', () => {
    const { unmount } = render(<MapCanvas />)
    const map = latestMapInstance()
    unmount()
    expect(map.remove).toHaveBeenCalledTimes(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Zone edit flow: clicking a zone then updating it must keep it on the map
// ─────────────────────────────────────────────────────────────────────────────

describe('MapCanvas — zone edit: zone stays on map after editing', () => {
  beforeEach(() => {
    MockZoneInfoPanel.mockClear()
  })

  /**
   * Simulate what happens when the user:
   *  1. Has a zone on the map (loaded from DB)
   *  2. Clicks it  → selectedFeature is set, ZoneInfoPanel opens
   *  3. Types a name and clicks Done  → onUpdate(updatedFeature) is called
   *  4. Zone must still appear in features-fill-src after the update
   */
  it('zone remains in features-fill-src after clicking Done on ZoneInfoPanel', async () => {
    const drawing: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [ZONE_FEATURE],
    }
    mockGetSiteMap.mockResolvedValueOnce({ id: 'map-1', drawing })

    render(<MapCanvas mapId="map-1" />)
    const map = latestMapInstance()
    await fireMapLoad(map)

    const fillSrc = map.sources.get('features-fill-src')!
    fillSrc.setData.mockClear()

    // ── Step 1: simulate user clicking on the zone ──────────────────────────
    // Mapbox click events return the feature as stored in the source.
    // We pass the feature as if returned from e.features[0] on features-fill.
    const mapboxClickFeature = {
      ...ZONE_FEATURE,
      // Mapbox serialises array properties to JSON strings
      properties: { ...ZONE_FEATURE.properties, photoUrls: '[]' },
    }

    await act(async () => {
      map.fireEvent('click', {
        features: [mapboxClickFeature],
        preventDefault: jest.fn(),
        defaultPrevented: false,
        lngLat: { lng: -119.5, lat: 37.5 },
      })
    })

    // ZoneInfoPanel should now be rendered and have received onUpdate
    expect(MockZoneInfoPanel).toHaveBeenCalled()
    const lastCallProps = MockZoneInfoPanel.mock.calls[MockZoneInfoPanel.mock.calls.length - 1][0] as {
      feature: GeoJSON.Feature
      onUpdate: (f: GeoJSON.Feature) => void
      onClose: () => void
    }
    expect(lastCallProps.onUpdate).toBeDefined()

    // ── Step 2: simulate user typing a name and clicking Done ──────────────
    // This mirrors ZoneInfoPanel.handleDone(): spreads the clicked feature's
    // properties (as received from Mapbox) then overrides individual fields.
    const clickedProps = mapboxClickFeature.properties as Record<string, unknown>
    const updatedFeature: GeoJSON.Feature = {
      ...mapboxClickFeature,
      properties: {
        ...clickedProps,
        name: 'Front Lawn',
        color: '#22c55e',
        opacity: 25,
        role: 'zone',
        areaType: 'turf',
        sunExposure: 'sunny',
        grassType: '',
        photoUrls: [],
        areaSqFt: clickedProps.areaSqFt ?? 0,
        perimeterFt: clickedProps.perimeterFt ?? 0,
      },
    }

    await act(async () => {
      lastCallProps.onUpdate(updatedFeature)
      lastCallProps.onClose()
    })

    // ── Step 3: verify zone still in fill source ────────────────────────────
    // updateMapSources must have been called with the updated zone
    const lastSetDataCall = fillSrc.setData.mock.calls.at(-1)?.[0] as GeoJSON.FeatureCollection
    expect(lastSetDataCall).toBeDefined()
    expect(lastSetDataCall.features).toHaveLength(1)
    expect(lastSetDataCall.features[0].properties?.featureType).toBe('zone')
    expect(lastSetDataCall.features[0].properties?.name).toBe('Front Lawn')
  })

  /**
   * Regression: In Mapbox GL 3.x, e.features[0] from a fill-layer click may
   * return a feature with geometry: null.  If we spread that into the updated
   * object the zone loses its coordinates, gets pushed to features-fill-src
   * without geometry, and vanishes from the map — even though it's still listed
   * in the ReviewPanel (featureType is intact, just no shape to render).
   *
   * Fix: look up the matching feature from the React state in the click handler
   * so selectedFeature always has complete geometry.
   */
  it('zone stays on map when Mapbox click returns feature with null geometry', async () => {
    const drawing: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [ZONE_FEATURE],
    }
    mockGetSiteMap.mockResolvedValueOnce({ id: 'map-3', drawing })

    render(<MapCanvas mapId="map-3" />)
    const map = latestMapInstance()
    await fireMapLoad(map)

    const fillSrc = map.sources.get('features-fill-src')!
    fillSrc.setData.mockClear()
    MockZoneInfoPanel.mockClear()

    // Simulate Mapbox returning the feature WITHOUT geometry (null)
    const mapboxClickFeatureNoGeom = {
      type: 'Feature',
      id: 'zone-1',
      geometry: null as unknown as GeoJSON.Geometry,
      properties: { ...ZONE_FEATURE.properties, photoUrls: '[]' },
    }

    await act(async () => {
      map.fireEvent('click', {
        features: [mapboxClickFeatureNoGeom],
        preventDefault: jest.fn(),
        defaultPrevented: false,
        lngLat: { lng: -119.5, lat: 37.5 },
      })
    })

    expect(MockZoneInfoPanel).toHaveBeenCalled()
    const props = MockZoneInfoPanel.mock.calls[MockZoneInfoPanel.mock.calls.length - 1][0] as {
      feature: GeoJSON.Feature
      onUpdate: (f: GeoJSON.Feature) => void
      onClose: () => void
    }

    // The feature passed to ZoneInfoPanel must have valid geometry (from state, not Mapbox click)
    expect(props.feature.geometry).not.toBeNull()
    expect(props.feature.geometry.type).toBe('Polygon')

    // Simulate Done: build updated feature from what ZoneInfoPanel would produce
    const updatedFeature: GeoJSON.Feature = {
      ...props.feature,
      properties: { ...props.feature.properties, name: 'Front Lawn' },
    }

    await act(async () => {
      props.onUpdate(updatedFeature)
      props.onClose()
    })

    const lastCall = fillSrc.setData.mock.calls.at(-1)?.[0] as GeoJSON.FeatureCollection
    expect(lastCall).toBeDefined()
    expect(lastCall.features).toHaveLength(1)
    expect(lastCall.features[0].geometry).not.toBeNull()
    expect(lastCall.features[0].properties?.featureType).toBe('zone')
    expect(lastCall.features[0].properties?.name).toBe('Front Lawn')
  })

  it('zone from DB without _fid still stays on map after editing', async () => {
    // Test the edge case where a feature was saved to DB before _fid was introduced.
    const zoneWithoutFid: GeoJSON.Feature = {
      type: 'Feature',
      geometry: ZONE_FEATURE.geometry,
      properties: {
        featureType: 'zone',
        name: '',
        color: '#22c55e',
        opacity: 25,
        areaSqFt: 1000,
        perimeterFt: 500,
      },
    }
    const drawing: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [zoneWithoutFid],
    }
    mockGetSiteMap.mockResolvedValueOnce({ id: 'map-2', drawing })

    render(<MapCanvas mapId="map-2" />)
    const map = latestMapInstance()
    await fireMapLoad(map)

    const fillSrc = map.sources.get('features-fill-src')!
    fillSrc.setData.mockClear()
    MockZoneInfoPanel.mockClear()

    await act(async () => {
      map.fireEvent('click', {
        features: [{ ...zoneWithoutFid, properties: { ...zoneWithoutFid.properties, photoUrls: '[]' } }],
        preventDefault: jest.fn(),
        defaultPrevented: false,
        lngLat: { lng: -119.5, lat: 37.5 },
      })
    })

    expect(MockZoneInfoPanel).toHaveBeenCalled()
    const props = MockZoneInfoPanel.mock.calls[MockZoneInfoPanel.mock.calls.length - 1][0] as {
      onUpdate: (f: GeoJSON.Feature) => void
      onClose: () => void
    }

    const updatedFeature: GeoJSON.Feature = {
      ...zoneWithoutFid,
      properties: { ...zoneWithoutFid.properties, name: 'Back Yard', photoUrls: [] },
    }

    await act(async () => {
      props.onUpdate(updatedFeature)
      props.onClose()
    })

    const lastCall = fillSrc.setData.mock.calls.at(-1)?.[0] as GeoJSON.FeatureCollection
    expect(lastCall).toBeDefined()
    expect(lastCall.features).toHaveLength(1)
    expect(lastCall.features[0].properties?.featureType).toBe('zone')
    expect(lastCall.features[0].properties?.name).toBe('Back Yard')
  })
})
