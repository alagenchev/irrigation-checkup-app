import { getClients } from '@/actions/clients'
import { getSites } from '@/actions/sites'
import { IrrigationForm } from './irrigation-form'

export default async function Home() {
  const [clients, sites] = await Promise.all([getClients(), getSites()])
  return <IrrigationForm clients={clients} sites={sites} />
}
