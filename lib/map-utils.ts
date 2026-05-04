import * as turf from '@turf/turf'
import type { ZoneFeatureProperties } from '@/types'

export function computeZoneStats(
  points: [number, number][]
): { areaSqFt: number; perimeterFt: number } | null {
  if (points.length < 3) return null
  const closed = [...points, points[0]]
  const poly = turf.polygon([closed])
  const areaSqFt = Math.round(turf.area(poly) * 10.7639)
  const perimeterFt = Math.round(turf.length(turf.lineString(closed), { units: 'feet' }))
  return { areaSqFt, perimeterFt }
}

export function buildZoneFeature(
  points: [number, number][],
  properties: Partial<ZoneFeatureProperties> = {}
): GeoJSON.Feature<GeoJSON.Polygon> {
  const closed = [...points, points[0]]
  const stats = computeZoneStats(points)
  const _fid = crypto.randomUUID()
  return {
    type: 'Feature',
    id: _fid,
    geometry: { type: 'Polygon', coordinates: [closed] },
    properties: {
      _fid,
      featureType: 'zone',
      name: '',
      color: '#22c55e',
      opacity: 25,
      role: 'zone',
      areaType: 'turf',
      sunExposure: 'sunny',
      grassType: '',
      photoUrls: [],
      areaSqFt: stats?.areaSqFt ?? 0,
      perimeterFt: stats?.perimeterFt ?? 0,
      ...properties,
    } as ZoneFeatureProperties,
  }
}

export function buildWireFeature(
  points: [number, number][],
  name = '',
  color = '#6b7280',
  notes = ''
): GeoJSON.Feature<GeoJSON.LineString> {
  const _fid = crypto.randomUUID()
  return {
    type: 'Feature',
    id: _fid,
    geometry: { type: 'LineString', coordinates: points },
    properties: { _fid, featureType: 'wire', name, color, notes },
  }
}

export function autoName(
  existingFeatures: GeoJSON.Feature[],
  type: string
): string {
  const prefix = type.charAt(0).toUpperCase() + type.slice(1)
  const existing = existingFeatures
    .filter(f => f.properties?.featureType === type)
    .map(f => f.properties?.name as string)
    .filter(Boolean)
  let n = 1
  while (existing.includes(`${prefix} ${n}`)) n++
  return `${prefix} ${n}`
}
