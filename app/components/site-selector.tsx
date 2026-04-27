'use client'

import React from 'react'
import { Autocomplete } from '@/components/ui/autocomplete'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import type { AutocompleteOption } from '@/components/ui/autocomplete'
import type { SiteWithClient } from '@/actions/sites'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SiteSelectorProps {
  sites: SiteWithClient[]
  selectedSiteName: string
  selectedAddress: string
  mode: 'existing' | 'new'
  onSiteSelect: (site: SiteWithClient) => void
  onModeChange: (mode: 'existing' | 'new') => void
  onNewSiteNameChange: (name: string) => void
  onNewAddressChange: (address: string) => void
  disabled?: boolean
}

// ── Pure helpers (injectable / unit-testable) ──────────────────────────────────

/**
 * Converts a SiteWithClient into an AutocompleteOption understood by <Autocomplete>.
 * Exported so tests can verify the mapping without rendering.
 */
export function siteToOption(site: SiteWithClient): AutocompleteOption {
  return {
    label:         site.name,
    address:       site.address       ?? undefined,
    clientName:    site.clientName    ?? undefined,
    clientAddress: site.clientAddress ?? undefined,
  }
}

/**
 * Filters the sites list by a search query.
 * Matches on site name OR site address (case-insensitive substring).
 * Returns all sites when query is empty.
 * Exported for unit tests.
 */
export function filterSites(sites: SiteWithClient[], query: string): SiteWithClient[] {
  const q = query.trim().toLowerCase()
  if (!q) return sites
  return sites.filter(
    s =>
      s.name.toLowerCase().includes(q) ||
      (s.address ?? '').toLowerCase().includes(q),
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SiteSelector({
  sites,
  selectedSiteName,
  selectedAddress,
  mode,
  onSiteSelect,
  onModeChange,
  onNewSiteNameChange,
  onNewAddressChange,
  disabled = false,
}: SiteSelectorProps): React.ReactElement {
  const siteOptions: AutocompleteOption[] = sites.map(siteToOption)

  function handleSiteAutocompleteSelect(opt: AutocompleteOption) {
    const matched = sites.find(s => s.name === opt.label)
    if (matched) onSiteSelect(matched)
  }

  return (
    <div data-testid="site-selector">
      {mode === 'existing' ? (
        <div data-testid="site-selector-existing-mode">
          <div style={{ border: '1px solid #3a3a3c', borderRadius: 8, padding: '12px 14px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px 0' }}>
              Existing Site
            </p>
            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label htmlFor="site-selector-search-input">
                  Site Name <span style={{ color: '#ffffff' }}>*</span>
                </label>
                {!disabled && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    data-testid="site-selector-mode-toggle"
                    onClick={() => onModeChange('new')}
                    style={{ fontSize: 11, padding: '2px 8px' }}
                  >
                    + New Site
                  </button>
                )}
              </div>
              <Autocomplete
                name="siteName"
                value={selectedSiteName}
                onChange={onNewSiteNameChange}
                onSelect={handleSiteAutocompleteSelect}
                options={siteOptions}
                placeholder="Type or select a site"
                disabled={disabled}
              />
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>Site Address</label>
              {disabled ? (
                <input
                  type="text"
                  value={selectedAddress}
                  readOnly
                  disabled
                  data-testid="site-selector-address-readonly"
                />
              ) : (
                <AddressAutocomplete
                  name="siteAddress"
                  value={selectedAddress}
                  onChange={onNewAddressChange}
                  placeholder="123 Main St, City, TX"
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div data-testid="site-selector-new-mode">
          <div className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label htmlFor="site-selector-new-name">
                Site Name <span style={{ color: '#ffffff' }}>*</span>
              </label>
              {!disabled && (
                <button
                  type="button"
                  className="btn btn-sm"
                  data-testid="site-selector-mode-toggle"
                  onClick={() => onModeChange('existing')}
                  style={{ fontSize: 11, padding: '2px 8px' }}
                >
                  Select Existing
                </button>
              )}
            </div>
            <input
              id="site-selector-new-name"
              type="text"
              value={selectedSiteName}
              onChange={e => onNewSiteNameChange(e.target.value)}
              placeholder="Enter new site name"
              disabled={disabled}
              data-testid="site-selector-new-name"
            />
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="site-selector-new-address">Site Address</label>
            {disabled ? (
              <input
                type="text"
                value={selectedAddress}
                readOnly
                disabled
                data-testid="site-selector-address-readonly"
              />
            ) : (
              <div data-testid="site-selector-new-address">
                <AddressAutocomplete
                  name="siteAddress"
                  value={selectedAddress}
                  onChange={onNewAddressChange}
                  placeholder="123 Main St, City, TX"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
