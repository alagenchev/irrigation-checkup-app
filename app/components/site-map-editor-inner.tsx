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
      center: [-98.5795, 39.8283],
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
