import { getClients } from '@/actions/clients'
import { getSites } from '@/actions/sites'
import { AddSiteForm } from './add-site-form'
import { SitesTable } from './sites-table'

export default async function SitesPage() {
  const [siteList, clientList] = await Promise.all([getSites(), getClients()])

  return (
    <main className="container">
      <div className="page-header">
        <h1>Sites</h1>
      </div>

      <section className="card">
        <h2>Add Site</h2>
        <AddSiteForm clients={clientList} />
      </section>

      <section className="card">
        <h2>All Sites ({siteList.length})</h2>
        <SitesTable sites={siteList} />
      </section>
    </main>
  )
}
