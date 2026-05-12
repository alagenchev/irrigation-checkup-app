import { notFound } from 'next/navigation'
import { getInspectionForEdit } from '@/actions/inspections'
import { getClients } from '@/actions/clients'
import { getSites } from '@/actions/sites'
import { getCompanySettings } from '@/actions/company-settings'
import { getInspectors } from '@/actions/inspectors'
import { IrrigationForm } from '@/app/irrigation-form'

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let initialData, clients, sites, company, inspectors
  try {
    ;[initialData, clients, sites, company, inspectors] = await Promise.all([
      getInspectionForEdit(id),
      getClients(),
      getSites(),
      getCompanySettings(),
      getInspectors(),
    ])
  } catch (err) {
    console.error('[InspectionDetailPage] Failed to load data for inspection', id, err)
    throw err
  }

  if (!initialData) notFound()

  return (
    <IrrigationForm
      initialData={initialData}
      clients={clients}
      sites={sites}
      company={company}
      inspectors={inspectors}
    />
  )
}
