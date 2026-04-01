import { getClients } from '@/actions/clients'
import { getSites } from '@/actions/sites'
import { getCompanySettings } from '@/actions/company-settings'
import { getInspectors } from '@/actions/inspectors'
import { IrrigationForm } from './irrigation-form'

export default async function Home() {
  const [clients, sites, company, inspectors] = await Promise.all([
    getClients(),
    getSites(),
    getCompanySettings(),
    getInspectors(),
  ])
  return <IrrigationForm clients={clients} sites={sites} company={company} inspectors={inspectors} />
}
