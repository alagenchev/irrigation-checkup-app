import { getCompanySettings } from '@/actions/company-settings'
import { CompanySettingsForm } from './company-settings-form'

export default async function CompanyPage() {
  const settings = await getCompanySettings()

  return (
    <main className="container">
      <div className="page-header">
        <h1>Company Settings</h1>
      </div>

      <section className="card">
        <h2>Company Information</h2>
        <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 16 }}>
          This information appears on all generated PDF reports.
        </p>
        <CompanySettingsForm initial={settings} />
      </section>
    </main>
  )
}
