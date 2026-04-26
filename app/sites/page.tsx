import { getClients } from '@/actions/clients'
import { getSites } from '@/actions/sites'
import { SitesPageClient } from './sites-page-client'

export default async function SitesPage() {
  const [siteList, clientList] = await Promise.all([getSites(), getClients()])

  return <SitesPageClient sites={siteList} clients={clientList} />
}
