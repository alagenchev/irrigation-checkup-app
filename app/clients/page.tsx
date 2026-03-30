import { getClients } from '@/actions/clients'
import { AddClientForm } from './add-client-form'
import { ClientsTable } from './clients-table'

export default async function ClientsPage() {
  const clientList = await getClients()

  return (
    <main className="container">
      <div className="page-header">
        <h1>Clients</h1>
      </div>

      <section className="card">
        <h2>Add Client</h2>
        <AddClientForm />
      </section>

      <section className="card">
        <h2>All Clients ({clientList.length})</h2>
        <ClientsTable clients={clientList} />
      </section>
    </main>
  )
}
