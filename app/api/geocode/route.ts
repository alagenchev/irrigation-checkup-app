import { NextRequest, NextResponse } from 'next/server'

interface NominatimAddress {
  house_number?: string
  road?: string
  suburb?: string
  city?: string
  town?: string
  village?: string
  county?: string
  state?: string
  postcode?: string
}

interface NominatimResult {
  address?: NominatimAddress
}

function formatAddress(addr: NominatimAddress): string {
  const street = addr.house_number && addr.road
    ? `${addr.house_number} ${addr.road}`
    : addr.road ?? ''
  const locality = addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? addr.county ?? ''
  return [street, locality, addr.state, addr.postcode].filter(Boolean).join(', ')
}

// In-memory cache for geocoding results
// Key: "lat,lon" → Value: array of formatted addresses
const geocodeCache = new Map<string, string[]>()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 })
  }

  const cacheKey = `${lat},${lon}`

  // Return cached result if available
  if (geocodeCache.has(cacheKey)) {
    return NextResponse.json(geocodeCache.get(cacheKey))
  }

  const ua = 'IrrigationInspectionApp/1.0 (contact@example.com)'
  const base = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lon}`

  // Fetch at zoom 18 (building) and zoom 16 (street) for two levels of detail
  const [r18, r16] = await Promise.all([
    fetch(`${base}&zoom=18`, { headers: { 'User-Agent': ua } }).then(r => r.json() as Promise<NominatimResult>),
    fetch(`${base}&zoom=16`, { headers: { 'User-Agent': ua } }).then(r => r.json() as Promise<NominatimResult>),
  ])

  const seen = new Set<string>()
  const results: string[] = []

  for (const result of [r18, r16]) {
    if (result.address) {
      const formatted = formatAddress(result.address)
      if (formatted && !seen.has(formatted)) {
        seen.add(formatted)
        results.push(formatted)
      }
    }
  }

  // Cache the result
  geocodeCache.set(cacheKey, results)

  return NextResponse.json(results)
}
