import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 3) return NextResponse.json([])

  const token = process.env.MAPBOX_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Geocoding service not configured' }, { status: 500 })
  }

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${token}&autocomplete=true&types=address,place&limit=5&language=en`

  try {
    const res = await fetch(url)
    if (!res.ok) return NextResponse.json([])
    const data = await res.json() as { features?: { place_name: string }[] }
    const suggestions = (data.features ?? []).map(f => f.place_name)
    return NextResponse.json(suggestions)
  } catch {
    return NextResponse.json([])
  }
}
