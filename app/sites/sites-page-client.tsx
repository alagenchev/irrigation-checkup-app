'use client'

import { useState } from 'react'
import { AddSiteForm } from './add-site-form'
import { SitesTable } from './sites-table'
import { SiteEquipmentEditor } from './site-equipment-editor'
import { SiteMapEditor } from '@/app/components/site-map-editor'
import type { SiteWithClient } from '@/actions/sites'
import type { Client } from '@/types'

interface SitesPageClientProps {
  sites: SiteWithClient[]
  clients: Client[]
}

type PanelState =
  | { type: 'equipment'; siteId: string }
  | { type: 'map'; siteId: string }
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
      prev?.type === 'map' && prev.siteId === siteId ? null : { type: 'map', siteId }
    )
  }

  function handleClose() {
    setPanelState(null)
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

        {/* Right: equipment editor or map panel */}
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
            {panelState.type === 'map' && (
              <SiteMapEditor
                key={selectedSite.id}
                siteId={selectedSite.id}
                siteName={selectedSite.name}
                onClose={handleClose}
              />
            )}
          </section>
        )}
      </div>
    </main>
  )
}
