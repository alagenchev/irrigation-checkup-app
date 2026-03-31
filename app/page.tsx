import { getClients } from '@/actions/clients'
import { getSites } from '@/actions/sites'
import { getCompanySettings } from '@/actions/company-settings'
import { getTechnicians } from '@/actions/technicians'
import { IrrigationForm } from './irrigation-form'

export default async function Home() {
  const [clients, sites, company, technicians] = await Promise.all([
    getClients(),
    getSites(),
    getCompanySettings(),
    getTechnicians(),
  ])
  return <IrrigationForm clients={clients} sites={sites} company={company} technicians={technicians} />
}
