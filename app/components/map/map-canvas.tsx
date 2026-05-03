'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getSiteMaps, saveSiteMapDrawing } from '@/actions/site-maps'
import { computeZoneStats, buildZoneFeature, buildWireFeature } from '@/lib/map-utils'
import { DrawingToolbar } from './drawing-toolbar'
import { ZoneInfoPanel } from './zone-info-panel'
import { AddPointPanel } from './add-point-panel'
import { ConfigurePointPanel } from './configure-point-panel'
import { ReviewPanel } from './review-panel'

export type DrawMode = 'idle' | 'zone' | 'wire' | 'point'

interface MapCanvasProps {
  mapId?: string
  siteName?: string
  onClose?: () => void
  initialCenter?: [number, number]
  initialDrawing?: GeoJSON.FeatureCollection | null
  onDrawingChange?: (drawing: GeoJSON.FeatureCollection) => void
  height?: number
}

export function MapCanvas({
  mapId,
  siteName,
  onClose,
  initialCenter,
  initialDrawing,
  onDrawingChange,
  height = 560,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  const [mode, setMode] = useState<DrawMode>('idle')
  const [features, setFeatures] = useState<GeoJSON.Feature[]>([])
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([])
  const [undoStack, setUndoStack] = useState<GeoJSON.Feature[][]>([])
  const [redoStack, setRedoStack] = useState<GeoJSON.Feature[][]>([])
  const [isSynced, setIsSynced] = useState(true)
  const [selectedFeature, setSelectedFeature] = useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(null)
  const [showAddPoint, setShowAddPoint] = useState(false)
  const [pendingPointCoord, setPendingPointCoord] = useState<[number, number] | null>(null)
  const [pendingPointType, setPendingPointType] = useState<string | null>(null)
  const [showReview, setShowReview] = useState(false)

  const modeRef = useRef<DrawMode>('idle')
  modeRef.current = mode

  const liveStats = useMemo(() => computeZoneStats(draftPoints), [draftPoints])

  // ---------- Map init ----------
  useEffect(() => {
    if (!containerRef.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: initialCenter ?? [-98.5795, 39.8283],
      zoom: initialCenter ? 15 : 3,
    })

    mapRef.current = map

    map.on('load', async () => {
      // Initialize sources
      map.addSource('features-fill-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addSource('features-outline-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addSource('features-draft-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addSource('features-points-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addSource('features-lines-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // Fill layer for zones
      map.addLayer({
        id: 'features-fill',
        type: 'fill',
        source: 'features-fill-src',
        filter: ['==', ['get', 'featureType'], 'zone'],
        paint: {
          'fill-color': ['coalesce', ['get', 'color'], '#22c55e'],
          'fill-opacity': ['coalesce', ['/', ['get', 'opacity'], 100], 0.25],
        },
      })

      // Outline layer for zones
      map.addLayer({
        id: 'features-outline',
        type: 'line',
        source: 'features-outline-src',
        filter: ['==', ['get', 'featureType'], 'zone'],
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#16a34a'],
          'line-width': 2,
        },
      })

      // Wire lines
      map.addLayer({
        id: 'features-lines',
        type: 'line',
        source: 'features-lines-src',
        filter: ['==', ['get', 'featureType'], 'wire'],
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#666666'],
          'line-width': 2,
        },
      })

      // Points/circles
      map.addLayer({
        id: 'features-points',
        type: 'circle',
        source: 'features-points-src',
        filter: ['!=', ['get', 'featureType'], 'zone'],
        paint: {
          'circle-radius': 8,
          'circle-color': ['coalesce', ['get', 'color'], '#3b82f6'],
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      })

      // Draft line
      map.addLayer({
        id: 'features-draft',
        type: 'line',
        source: 'features-draft-src',
        paint: {
          'line-color': '#f59e0b',
          'line-width': 2,
          'line-dasharray': [4, 2],
        },
      })

      // Load initial features
      let loadedFeatures: GeoJSON.Feature[] = []
      if (mapId) {
        // Will be loaded via action; get siteId from map record
        // We pass the mapId, so we need to query via getSiteMaps
        // Since we don't have siteId here, we rely on the parent passing initialDrawing
      }
      if (initialDrawing?.features) {
        loadedFeatures = initialDrawing.features
      }
      setFeatures(loadedFeatures)
    })

    map.on('click', (e) => {
      const currentMode = modeRef.current
      const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      if (currentMode === 'zone' || currentMode === 'wire') {
        setDraftPoints(prev => [...prev, coord])
      } else if (currentMode === 'point') {
        setPendingPointCoord(coord)
        setShowAddPoint(true)
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId])

  // Load mapId data after init (when mapId is set, fetch from server)
  useEffect(() => {
    if (!mapId) return
    let cancelled = false
    async function load() {
      if (!mapId) return
      // We need to get the siteId to query, but the parent didn't pass it.
      // Instead we pass initialDrawing from the parent. If mapId is set and
      // initialDrawing is provided, use that; otherwise fetch indirectly.
      // Since the parent (sites-page-client) doesn't pass initialDrawing yet,
      // we fetch all maps for any site by checking which one matches mapId.
      // This is handled by passing initialDrawing from parent in Phase 3+.
      // For now rely on initialDrawing prop.
    }
    load()
    return () => { cancelled = true }
  }, [mapId])

  // ---------- Render features on map ----------
  const updateMapSources = useCallback((allFeatures: GeoJSON.Feature[], draft: [number, number][]) => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    const zoneFeatures = allFeatures.filter(f => f.properties?.featureType === 'zone')
    const pointFeatures = allFeatures.filter(f =>
      f.properties?.featureType !== 'zone' && f.properties?.featureType !== 'wire' &&
      f.geometry?.type === 'Point'
    )
    const lineFeatures = allFeatures.filter(f => f.properties?.featureType === 'wire')

    const fillSrc = map.getSource('features-fill-src') as mapboxgl.GeoJSONSource | undefined
    if (fillSrc) fillSrc.setData({ type: 'FeatureCollection', features: zoneFeatures })

    const outlineSrc = map.getSource('features-outline-src') as mapboxgl.GeoJSONSource | undefined
    if (outlineSrc) outlineSrc.setData({ type: 'FeatureCollection', features: zoneFeatures })

    const pointsSrc = map.getSource('features-points-src') as mapboxgl.GeoJSONSource | undefined
    if (pointsSrc) pointsSrc.setData({ type: 'FeatureCollection', features: pointFeatures })

    const linesSrc = map.getSource('features-lines-src') as mapboxgl.GeoJSONSource | undefined
    if (linesSrc) linesSrc.setData({ type: 'FeatureCollection', features: lineFeatures })

    // Draft line
    const draftSrc = map.getSource('features-draft-src') as mapboxgl.GeoJSONSource | undefined
    if (draftSrc && draft.length >= 2) {
      draftSrc.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: draft },
          properties: {},
        }],
      })
    } else if (draftSrc) {
      draftSrc.setData({ type: 'FeatureCollection', features: [] })
    }
  }, [])

  useEffect(() => {
    updateMapSources(features, draftPoints)
  }, [features, draftPoints, updateMapSources])

  // ---------- Auto-save ----------
  useEffect(() => {
    if (features.length === 0 && !mapId) return
    setIsSynced(false)
    const timer = setTimeout(async () => {
      const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features }
      if (mapId) {
        await saveSiteMapDrawing(mapId, fc)
      } else {
        onDrawingChange?.(fc)
      }
      setIsSynced(true)
    }, 800)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features, mapId])

  // ---------- Drawing actions ----------
  function finishDrawing() {
    if (mode === 'zone') {
      if (draftPoints.length < 3) return
      const newFeature = buildZoneFeature(draftPoints)
      setUndoStack(prev => [...prev, features])
      setRedoStack([])
      setFeatures(prev => [...prev, newFeature])
      setDraftPoints([])
      setMode('idle')
      setSelectedFeature(newFeature)
    } else if (mode === 'wire') {
      if (draftPoints.length < 2) return
      const wireName = window.prompt('Wire name (optional):', '') ?? ''
      const newFeature = buildWireFeature(draftPoints, wireName)
      setUndoStack(prev => [...prev, features])
      setRedoStack([])
      setFeatures(prev => [...prev, newFeature])
      setDraftPoints([])
      setMode('idle')
    }
  }

  function undoLastPoint() {
    setDraftPoints(prev => prev.slice(0, -1))
  }

  function cancelDrawing() {
    setDraftPoints([])
    setMode('idle')
  }

  function undo() {
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setRedoStack(r => [...r, features])
      setFeatures(last)
      return prev.slice(0, -1)
    })
  }

  function redo() {
    setRedoStack(prev => {
      if (prev.length === 0) return prev
      const next = prev[prev.length - 1]
      setUndoStack(u => [...u, features])
      setFeatures(next)
      return prev.slice(0, -1)
    })
  }

  function handleUpdateFeature(updated: GeoJSON.Feature) {
    setFeatures(prev => prev.map(f => f === selectedFeature ? updated : f))
    setSelectedFeature(null)
  }

  function handleDuplicateZone() {
    if (!selectedFeature) return
    setUndoStack(prev => [...prev, features])
    setRedoStack([])
    setFeatures(prev => [...prev, { ...selectedFeature, properties: { ...selectedFeature.properties, name: `${selectedFeature.properties?.name ?? ''} (copy)` } }])
    setSelectedFeature(null)
  }

  function handleDeleteZone() {
    if (!selectedFeature) return
    setUndoStack(prev => [...prev, features])
    setRedoStack([])
    setFeatures(prev => prev.filter(f => f !== selectedFeature))
    setSelectedFeature(null)
  }

  function handlePointTypeSelect(type: string) {
    setShowAddPoint(false)
    setPendingPointType(type)
  }

  function handlePointConfigured(feature: GeoJSON.Feature) {
    setUndoStack(prev => [...prev, features])
    setRedoStack([])
    setFeatures(prev => [...prev, feature])
    setPendingPointType(null)
    setPendingPointCoord(null)
    setMode('idle')
  }

  function handleCancelPoint() {
    setShowAddPoint(false)
    setPendingPointType(null)
    setPendingPointCoord(null)
    setMode('idle')
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{siteName ? `Map — ${siteName}` : 'Map Editor'}</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            data-testid="map-review-btn"
            className="btn btn-sm"
            onClick={() => setShowReview(true)}
          >
            Review
          </button>
          {onClose && (
            <button className="btn btn-sm" onClick={onClose}>Back</button>
          )}
        </div>
      </div>

      {/* Map container */}
      <div style={{ position: 'relative' }}>
        <div
          ref={containerRef}
          data-testid="site-map-container"
          style={{ width: '100%', height, borderRadius: 8 }}
        />

        {/* Mode tag overlay */}
        {mode !== 'idle' && (
          <div
            data-testid="map-mode-tag"
            style={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.75)',
              color: '#fff',
              borderRadius: 20,
              padding: '6px 16px',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              zIndex: 10,
            }}
          >
            {mode === 'zone' && 'Drawing Zone'}
            {mode === 'wire' && 'Drawing Wire'}
            {mode === 'point' && 'Adding Point'}
            <button
              onClick={cancelDrawing}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                padding: '0 2px',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Live stats bar */}
        {mode === 'zone' && draftPoints.length >= 2 && liveStats && (
          <div
            data-testid="map-stats-bar"
            style={{
              position: 'absolute',
              bottom: 60,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.75)',
              color: '#fff',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 13,
              zIndex: 10,
              whiteSpace: 'nowrap',
            }}
          >
            Perimeter: {liveStats.perimeterFt} ft · Area: ~{liveStats.areaSqFt} sq ft / {draftPoints.length} points
          </div>
        )}

        {/* Drawing controls (zone/wire mode) */}
        {(mode === 'zone' || mode === 'wire') && (
          <div
            data-testid="map-drawing-controls"
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 8,
              zIndex: 10,
            }}
          >
            <button
              data-testid="map-undo-point"
              className="btn btn-sm"
              onClick={undoLastPoint}
              disabled={draftPoints.length === 0}
            >
              Undo Point
            </button>
            <button
              data-testid="map-finish-drawing"
              className="btn btn-sm"
              onClick={finishDrawing}
              style={{ background: '#16a34a', color: '#fff' }}
              disabled={(mode === 'zone' && draftPoints.length < 3) || (mode === 'wire' && draftPoints.length < 2)}
            >
              ✓ Finish
            </button>
            <button
              data-testid="map-cancel-drawing"
              className="btn btn-sm"
              onClick={cancelDrawing}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Zone info panel */}
        {selectedFeature && (
          <ZoneInfoPanel
            feature={selectedFeature}
            allFeatures={features}
            onUpdate={handleUpdateFeature}
            onDuplicate={handleDuplicateZone}
            onDelete={handleDeleteZone}
            onClose={() => setSelectedFeature(null)}
          />
        )}

        {/* Add point type selector */}
        {showAddPoint && !pendingPointType && (
          <AddPointPanel
            onSelect={handlePointTypeSelect}
            onClose={handleCancelPoint}
          />
        )}

        {/* Configure point */}
        {pendingPointType && pendingPointCoord && (
          <ConfigurePointPanel
            pointType={pendingPointType}
            coord={pendingPointCoord}
            allFeatures={features}
            onConfirm={handlePointConfigured}
            onBack={handleCancelPoint}
          />
        )}

        {/* Review panel */}
        {showReview && (
          <ReviewPanel
            features={features}
            onClose={() => setShowReview(false)}
          />
        )}
      </div>

      {/* Toolbar */}
      {mode === 'idle' && (
        <DrawingToolbar
          mode={mode}
          onSetMode={(m) => {
            setMode(m)
            if (m !== 'idle') {
              setDraftPoints([])
            }
          }}
          isSynced={isSynced}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={undo}
          onRedo={redo}
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
        />
      )}
    </div>
  )
}
