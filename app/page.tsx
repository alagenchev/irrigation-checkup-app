import { getClients } from '@/actions/clients'
import { getSites } from '@/actions/sites'
import { getCompanySettings } from '@/actions/company-settings'
import { IrrigationForm } from './irrigation-form'

export default async function Home() {
  const [clients, sites, company] = await Promise.all([
    getClients(),
    getSites(),
    getCompanySettings(),
  ])
  return <IrrigationForm clients={clients} sites={sites} company={company} />
}
