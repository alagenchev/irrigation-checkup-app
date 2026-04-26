'use client'

import { useState } from 'react'
import { AddSiteForm } from './add-site-form'
import { SitesTable } from './sites-table'
import { SiteEquipmentEditor } from './site-equipment-editor'
import type { SiteWithClient } from '@/actions/sites'
import type { Client } from '@/types'

interface SitesPageClientProps {
  sites: SiteWithClient[]
  clients: Client[]
}

export function SitesPageClient({ sites, clients }: SitesPageClientProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)

  const selectedSite = selectedSiteId ? sites.find(s => s.id === selectedSiteId) ?? null : null

  function handleEditEquipment(siteId: string) {
    setSelectedSiteId(prev => prev === siteId ? null : siteId)
  }

  function handleClose() {
    setSelectedSiteId(null)
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
          style={{ flex: selectedSite ? '0 0 auto' : '1 1 auto', minWidth: 0, width: selectedSite ? '55%' : '100%', transition: 'width 0.2s' }}
          data-testid="sites-page-table-panel"
        >
          <h2>All Sites ({sites.length})</h2>
          <SitesTable sites={sites} onEditEquipment={handleEditEquipment} />
        </section>

        {/* Right: equipment editor panel */}
        {selectedSite && (
          <section
            className="card"
            style={{ flex: '1 1 auto', minWidth: 0 }}
            data-testid="sites-page-editor-panel"
          >
            <SiteEquipmentEditor
              key={selectedSite.id}
              site={selectedSite}
              onClose={handleClose}
              onSave={handleClose}
            />
          </section>
        )}
      </div>
    </main>
  )
}
