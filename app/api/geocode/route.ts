import { NextRequest, NextResponse } from 'next/server'

interface MapboxFeature {
  place_name: string
}

interface MapboxResponse {
  features?: MapboxFeature[]
}

// In-memory cache for geocoding results
// Key: "lat,lon" → Value: array of formatted addresses
const geocodeCache = new Map<string, string[]>()

async function fetchMapbox(url: string): Promise<MapboxResponse | null> {
  try {
    const res = await fetch(url)

    // Check HTTP status
    if (!res.ok) {
      const status = res.status
      const text = await res.text()
      console.error(`[geocode] Mapbox HTTP ${status}`, {
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
      const data = await res.json() as MapboxResponse
      return data
    } catch (parseErr) {
      const text = await res.text()
      console.error('[geocode] Failed to parse Mapbox JSON response', {
        url,
        parseError: parseErr instanceof Error ? parseErr.message : String(parseErr),
        responseLength: text.length,
        responsePreview: text.slice(0, 500),
        contentType: res.headers.get('content-type'),
      })
      return null
    }
  } catch (err) {
    console.error('[geocode] Mapbox fetch failed', {
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

    const token = process.env.MAPBOX_ACCESS_TOKEN
    if (!token) {
      console.error('[geocode] MAPBOX_ACCESS_TOKEN is not set')
      return NextResponse.json(
        { error: 'Geocoding service not configured' },
        { status: 500 }
      )
    }

    // Mapbox reverse geocoding: {lon},{lat}
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${token}`

    // Single request to Mapbox
    const result = await fetchMapbox(url)

    // Handle failure
    if (!result) {
      console.error('[geocode] Mapbox request failed', { lat, lon })
      return NextResponse.json(
        { error: 'Geocoding service unavailable' },
        { status: 503 }
      )
    }

    const results: string[] = []
    if (result.features && result.features.length > 0) {
      // Use the first (most relevant) result
      const placeName = result.features[0].place_name
      if (placeName) {
        results.push(placeName)
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
