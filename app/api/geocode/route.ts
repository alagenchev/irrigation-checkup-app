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

async function fetchNominatim(url: string, ua: string): Promise<NominatimResult | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': ua } })

    // Check HTTP status
    if (!res.ok) {
      const status = res.status
      const text = await res.text()
      console.error(`[geocode] Nominatim HTTP ${status}`, {
        url,
        status,
        statusText: res.statusText,
        responseLength: text.length,
        responsePreview: text.slice(0, 200),
      })
      return null
    }

    // Parse JSON
    try {
      const data = await res.json() as NominatimResult
      return data
    } catch (parseErr) {
      const text = await res.text()
      console.error('[geocode] Failed to parse Nominatim JSON response', {
        url,
        parseError: parseErr instanceof Error ? parseErr.message : String(parseErr),
        responseLength: text.length,
        responsePreview: text.slice(0, 500),
        contentType: res.headers.get('content-type'),
      })
      return null
    }
  } catch (err) {
    console.error('[geocode] Nominatim fetch failed', {
      url,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
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
      fetchNominatim(`${base}&zoom=18`, ua),
      fetchNominatim(`${base}&zoom=16`, ua),
    ])

    // Handle failure cases
    if (!r18 && !r16) {
      console.error('[geocode] Both Nominatim requests failed', { lat, lon })
      return NextResponse.json(
        { error: 'Geocoding service unavailable (both zoom levels failed)' },
        { status: 503 }
      )
    }

    const seen = new Set<string>()
    const results: string[] = []

    for (const result of [r18, r16]) {
      if (result?.address) {
        const formatted = formatAddress(result.address)
        if (formatted && !seen.has(formatted)) {
          seen.add(formatted)
          results.push(formatted)
        }
      }
    }

    // Cache the result (even if empty — avoid repeated requests)
    geocodeCache.set(cacheKey, results)

    return NextResponse.json(results)
  } catch (err) {
    console.error('[geocode] Unexpected error in GET handler', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
    return NextResponse.json(
      { error: 'Internal server error during geocoding' },
      { status: 500 }
    )
  }
}
