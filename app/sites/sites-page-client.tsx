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

  return (
    <main className="container" data-testid="sites-page">
      <div className="page-header">
        <h1>Sites</h1>
      </div>

      <section className="card">
        <h2>Add Site</h2>
        <AddSiteForm clients={clients} />
      </section>

      <div
        data-testid="sites-page-layout"
        style={{
          display: 'flex',
          gap: 24,
          alignItems: 'flex-start',
        }}
      >
        {/* Left: sites list */}
        <section
          className="card"
          style={{
            flex: panelState !== null ? '0 0 auto' : '1 1 auto',
            minWidth: 0,
            width: panelState !== null ? '55%' : '100%',
            transition: 'width 0.2s',
          }}
          data-testid="sites-page-table-panel"
        >
          <h2>All Sites ({sites.length})</h2>
          <SitesTable
            sites={sites}
            onEditEquipment={handleEditEquipment}
            onViewMap={handleViewMap}
          />
        </section>

        {/* Right: equipment editor, maps list, or map editor panel */}
        {panelState !== null && selectedSite && (
          <section
            className="card"
            style={{ flex: '1 1 auto', minWidth: 0 }}
            data-testid="sites-page-editor-panel"
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
                onEditMap={(mapId) => handleEditMap(selectedSite.id, mapId)}
                onClose={handleClose}
              />
            )}
            {panelState.type === 'map-editor' && (
              <MapCanvas
                key={panelState.mapId}
                mapId={panelState.mapId}
                siteName={selectedSite.name}
                onClose={() => handleBackToList(selectedSite.id)}
              />
            )}
          </section>
        )}
      </div>
    </main>
  )
}
