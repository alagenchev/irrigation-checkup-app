import { getClients } from '@/actions/clients'
import { getSites } from '@/actions/sites'
import { getCompanySettings } from '@/actions/company-settings'
import { getInspectors } from '@/actions/inspectors'
import { IrrigationForm } from './irrigation-form'

export default async function Home() {
  try {
    const [clients, sites, company, inspectors] = await Promise.all([
      getClients(),
      getSites(),
      getCompanySettings(),
      getInspectors(),
    ])
    return <IrrigationForm clients={clients} sites={sites} company={company} inspectors={inspectors} />
  } catch (err) {
    console.error('[HomePage] Failed to load page data', err)
    throw err
  }
}
