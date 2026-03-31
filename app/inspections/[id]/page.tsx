import { notFound } from 'next/navigation'
import { getInspectionForEdit } from '@/actions/inspections'
import { getClients } from '@/actions/clients'
import { getSites } from '@/actions/sites'
import { getCompanySettings } from '@/actions/company-settings'
import { getTechnicians } from '@/actions/technicians'
import { IrrigationForm } from '@/app/irrigation-form'

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const siteVisitId = parseInt(id, 10)

  if (isNaN(siteVisitId)) notFound()

  const [initialData, clients, sites, company, technicians] = await Promise.all([
    getInspectionForEdit(siteVisitId),
    getClients(),
    getSites(),
    getCompanySettings(),
    getTechnicians(),
  ])

  if (!initialData) notFound()

  return (
    <IrrigationForm
      initialData={initialData}
      clients={clients}
      sites={sites}
      company={company}
      technicians={technicians}
    />
  )
}
