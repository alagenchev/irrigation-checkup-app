'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { AddSiteForm } from './add-site-form'
import { SitesTable } from './sites-table'
import { SiteEquipmentEditor } from './site-equipment-editor'
import { MapsListPanel } from '@/app/components/map/maps-list-panel'
import type { SiteWithClient } from '@/actions/sites'
import type { Client } from '@/types'

const MapCanvas = dynamic(
  () => import('@/app/components/map/map-canvas').then(m => ({ default: m.MapCanvas })),
  { ssr: false, loading: () => <div style={{ color: '#a1a1aa', padding: 16 }}>Loading map…</div> },
)

interface SitesPageClientProps {
  sites: SiteWithClient[]
  clients: Client[]
}

type PanelState =
  | { type: 'equipment'; siteId: string }
  | { type: 'maps-list'; siteId: string }
  | { type: 'map-editor'; siteId: string; mapId: string }
  | null

export function SitesPageClient({ sites, clients }: SitesPageClientProps) {
  const [panelState, setPanelState] = useState<PanelState>(null)

  const activeSiteId = panelState?.siteId ?? null
  const selectedSite = activeSiteId ? sites.find(s => s.id === activeSiteId) ?? null : null

  function handleEditEquipment(siteId: string) {
    setPanelState(prev =>
      prev?.type === 'equipment' && prev.siteId === siteId ? null : { type: 'equipment', siteId }
    )
  }

  function handleViewMap(siteId: string) {
    setPanelState(prev =>
      prev?.type === 'maps-list' && prev.siteId === siteId ? null : { type: 'maps-list', siteId }
    )
  }

  function handleEditMap(siteId: string, mapId: string) {
    setPanelState({ type: 'map-editor', siteId, mapId })
  }

  function handleClose() {
    setPanelState(null)
  }

  function handleBackToList(siteId: string) {
    setPanelState({ type: 'maps-list', siteId })
  }

  // Equipment editor, maps list, and map editor all take over the full viewport for maximum usability
  if ((panelState?.type === 'equipment' || panelState?.type === 'maps-list' || panelState?.type === 'map-editor') && selectedSite) {
    return (
      <div
        data-testid="sites-page-map-fullscreen"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: '#fff',
          padding: '20px 24px',
          boxSizing: 'border-box',
          overflow: 'auto',
        }}
      >
        {panelState.type === 'equipment' && (
          <SiteEquipmentEditor
            key={selectedSite.id}
            site={selectedSite}
            onClose={handleClose}
            onSave={handleClose}
          />
        )}
        {panelState.type === 'maps-list' && (
          <MapsListPanel
            key={selectedSite.id}
            siteId={selectedSite.id}
            siteName={selectedSite.name}
            siteAddress={selectedSite.address}
            onEditMap={(mapId) => handleEditMap(selectedSite.id, mapId)}
            onClose={handleClose}
            previewHeight={500}
          />
        )}
        {panelState.type === 'map-editor' && (
          <MapCanvas
            key={panelState.mapId}
            mapId={panelState.mapId}
            siteName={selectedSite.name}
            siteAddress={selectedSite.address}
            onClose={() => handleBackToList(selectedSite.id)}
            height='calc(100vh - 140px)'
          />
        )}
      </div>
    )
  }

  return (
    <main className="container" data-testid="sites-page">
      <div className="page-header">
        <h1>Sites</h1>
      </div>

      <section className="card">
        <h2>Add Site</h2>
        <AddSiteForm clients={clients} />
      </section>

      <section className="card" data-testid="sites-page-table-panel">
        <h2>All Sites ({sites.length})</h2>
        <SitesTable
          sites={sites}
          onEditEquipment={handleEditEquipment}
          onViewMap={handleViewMap}
        />
      </section>
    </main>
  )
}
