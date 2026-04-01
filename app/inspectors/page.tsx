import { getInspectors } from '@/actions/inspectors'
import { AddInspectorForm } from './add-inspector-form'
import { InspectorsTable } from './inspectors-table'

export default async function InspectorsPage() {
  const inspectorList = await getInspectors()

  return (
    <main className="container">
      <div className="page-header">
        <h1>Inspectors</h1>
      </div>

      <section className="card">
        <h2>Add Inspector</h2>
        <AddInspectorForm />
      </section>

      <section className="card">
        <h2>All Inspectors ({inspectorList.length})</h2>
        <InspectorsTable inspectors={inspectorList} />
      </section>
    </main>
  )
}
