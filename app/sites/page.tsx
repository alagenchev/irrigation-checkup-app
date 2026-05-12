import { getClients } from '@/actions/clients'
import { getSites } from '@/actions/sites'
import { SitesPageClient } from './sites-page-client'

export default async function SitesPage() {
  try {
    const [siteList, clientList] = await Promise.all([getSites(), getClients()])
    return <SitesPageClient sites={siteList} clients={clientList} />
  } catch (err) {
    console.error('[SitesPage] Failed to load page data', err)
    throw err
  }
}
