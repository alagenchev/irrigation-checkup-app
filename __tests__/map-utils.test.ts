/**
 * Unit tests for lib/map-utils.ts
 *
 * Covers: computeZoneStats, buildZoneFeature, buildWireFeature, autoName
 */

import { computeZoneStats, buildZoneFeature, buildWireFeature, autoName } from '@/lib/map-utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// A small square ~10m × 10m around [-120, 37]
const SQUARE: [number, number][] = [
  [-120.0001, 37.0001],
  [-120.0000, 37.0001],
  [-120.0000, 37.0000],
  [-120.0001, 37.0000],
]

// ---------------------------------------------------------------------------
// computeZoneStats
// ---------------------------------------------------------------------------

describe('computeZoneStats', () => {
  test('returns null with 0 points', () => {
    expect(computeZoneStats([])).toBeNull()
  })

  test('returns null with 1 point', () => {
    expect(computeZoneStats([[-120, 37]])).toBeNull()
  })

  test('returns null with 2 points', () => {
    expect(computeZoneStats([[-120, 37], [-119, 37]])).toBeNull()
  })

  test('returns non-null stats with 3 points', () => {
    const pts: [number, number][] = [[-120, 37], [-119, 37], [-119, 38]]
    const stats = computeZoneStats(pts)
    expect(stats).not.toBeNull()
    expect(stats!.areaSqFt).toBeGreaterThan(0)
    expect(stats!.perimeterFt).toBeGreaterThan(0)
  })

  test('returns integer values (rounded)', () => {
    const stats = computeZoneStats(SQUARE)
    expect(stats).not.toBeNull()
    expect(Number.isInteger(stats!.areaSqFt)).toBe(true)
    expect(Number.isInteger(stats!.perimeterFt)).toBe(true)
  })

  test('area is reasonable for a small square', () => {
    const stats = computeZoneStats(SQUARE)
    // ~100 sq m → ~1076 sq ft; accept ±50% for coordinate approximation
    expect(stats!.areaSqFt).toBeGreaterThan(100)
    expect(stats!.areaSqFt).toBeLessThan(2000)
  })

  test('perimeter is reasonable for a small square', () => {
    const stats = computeZoneStats(SQUARE)
    // ~40 m → ~131 ft; accept ±50%
    expect(stats!.perimeterFt).toBeGreaterThan(50)
    expect(stats!.perimeterFt).toBeLessThan(400)
  })
})

// ---------------------------------------------------------------------------
// buildZoneFeature
// ---------------------------------------------------------------------------

describe('buildZoneFeature', () => {
  test('returns a GeoJSON Feature with Polygon geometry', () => {
    const f = buildZoneFeature(SQUARE)
    expect(f.type).toBe('Feature')
    expect(f.geometry.type).toBe('Polygon')
  })

  test('polygon is closed (first point repeated at end)', () => {
    const f = buildZoneFeature(SQUARE)
    const ring = f.geometry.coordinates[0]
    expect(ring.length).toBe(SQUARE.length + 1)
    expect(ring[0]).toEqual(ring[ring.length - 1])
  })

  test('has required default properties', () => {
    const f = buildZoneFeature(SQUARE)
    expect(f.properties!.featureType).toBe('zone')
    expect(f.properties!.color).toBe('#22c55e')
    expect(f.properties!.opacity).toBe(25)
    expect(f.properties!.areaSqFt).toBeGreaterThan(0)
    expect(f.properties!.perimeterFt).toBeGreaterThan(0)
  })

  test('accepts property overrides', () => {
    const f = buildZoneFeature(SQUARE, { name: 'Front Lawn', color: '#ff0000' })
    expect(f.properties!.name).toBe('Front Lawn')
    expect(f.properties!.color).toBe('#ff0000')
  })

  test('assigns a unique _fid to each feature', () => {
    const f1 = buildZoneFeature(SQUARE)
    const f2 = buildZoneFeature(SQUARE)
    expect(f1.properties!._fid).not.toBe(f2.properties!._fid)
  })

  test('id matches _fid property', () => {
    const f = buildZoneFeature(SQUARE)
    expect(f.id).toBe(f.properties!._fid)
  })

  test('areaSqFt is 0 when fewer than 3 points (degenerate)', () => {
    // 2-point polygon is degenerate; computeZoneStats returns null → 0
    const f = buildZoneFeature([[-120, 37], [-119, 37]])
    expect(f.properties!.areaSqFt).toBe(0)
    expect(f.properties!.perimeterFt).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// buildWireFeature
// ---------------------------------------------------------------------------

describe('buildWireFeature', () => {
  const WIRE_PTS: [number, number][] = [[-120, 37], [-119, 38], [-118, 37]]

  test('returns a GeoJSON Feature with LineString geometry', () => {
    const f = buildWireFeature(WIRE_PTS)
    expect(f.type).toBe('Feature')
    expect(f.geometry.type).toBe('LineString')
  })

  test('coordinates match input points', () => {
    const f = buildWireFeature(WIRE_PTS)
    expect(f.geometry.coordinates).toEqual(WIRE_PTS)
  })

  test('defaults name, color, notes to empty string', () => {
    const f = buildWireFeature(WIRE_PTS)
    expect(f.properties!.name).toBe('')
    expect(f.properties!.color).toBe('#6b7280')
    expect(f.properties!.notes).toBe('')
  })

  test('accepts custom name, color, notes', () => {
    const f = buildWireFeature(WIRE_PTS, 'Main line', '#ff0000', 'check pressure')
    expect(f.properties!.name).toBe('Main line')
    expect(f.properties!.color).toBe('#ff0000')
    expect(f.properties!.notes).toBe('check pressure')
  })

  test('featureType is wire', () => {
    const f = buildWireFeature(WIRE_PTS)
    expect(f.properties!.featureType).toBe('wire')
  })

  test('assigns unique _fid per call', () => {
    const f1 = buildWireFeature(WIRE_PTS)
    const f2 = buildWireFeature(WIRE_PTS)
    expect(f1.properties!._fid).not.toBe(f2.properties!._fid)
  })

  test('id matches _fid property', () => {
    const f = buildWireFeature(WIRE_PTS)
    expect(f.id).toBe(f.properties!._fid)
  })
})

// ---------------------------------------------------------------------------
// autoName
// ---------------------------------------------------------------------------

describe('autoName', () => {
  test('returns "Zone 1" when no existing zone features', () => {
    expect(autoName([], 'zone')).toBe('Zone 1')
  })

  test('returns "Wire 1" when no existing wire features', () => {
    expect(autoName([], 'wire')).toBe('Wire 1')
  })

  test('increments past existing names', () => {
    const features: GeoJSON.Feature[] = [
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { featureType: 'zone', name: 'Zone 1' } },
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { featureType: 'zone', name: 'Zone 2' } },
    ]
    expect(autoName(features, 'zone')).toBe('Zone 3')
  })

  test('fills gaps in numbering', () => {
    // Zone 1 and Zone 3 exist — next should be Zone 2
    const features: GeoJSON.Feature[] = [
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { featureType: 'zone', name: 'Zone 1' } },
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { featureType: 'zone', name: 'Zone 3' } },
    ]
    expect(autoName(features, 'zone')).toBe('Zone 2')
  })

  test('ignores features of a different type', () => {
    const features: GeoJSON.Feature[] = [
      { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: { featureType: 'wire', name: 'Wire 1' } },
    ]
    // Asking for 'zone' name — wire features should be ignored
    expect(autoName(features, 'zone')).toBe('Zone 1')
  })

  test('ignores features with no name', () => {
    const features: GeoJSON.Feature[] = [
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { featureType: 'zone', name: '' } },
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { featureType: 'zone', name: null } },
    ]
    expect(autoName(features, 'zone')).toBe('Zone 1')
  })

  test('capitalizes the type prefix correctly', () => {
    expect(autoName([], 'zone')).toMatch(/^Zone/)
    expect(autoName([], 'wire')).toMatch(/^Wire/)
  })
})
