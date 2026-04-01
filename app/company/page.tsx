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

      <section className="card">
        <h2>Cloudflare R2 Setup</h2>
        <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 16 }}>
          Zone photos are stored in Cloudflare R2. Follow these steps to configure it.
        </p>
        <ol style={{ color: '#a1a1aa', fontSize: 13, lineHeight: 2, paddingLeft: 20 }}>
          <li>
            <strong style={{ color: '#f4f4f5' }}>Create a bucket</strong> — Go to{' '}
            <strong style={{ color: '#f4f4f5' }}>Cloudflare Dashboard → R2 Object Storage → Create bucket</strong>.
            Choose a name (e.g. <code>field-tech-files</code>). This is the top-level app bucket.
          </li>
          <li>
            <strong style={{ color: '#f4f4f5' }}>Find your Account ID</strong> — Visible in the Cloudflare
            Dashboard URL: <code>dash.cloudflare.com/&lt;account-id&gt;/</code>, or in the right sidebar on
            any Cloudflare page.
          </li>
          <li>
            <strong style={{ color: '#f4f4f5' }}>Create an API token</strong> — Go to{' '}
            <strong style={{ color: '#f4f4f5' }}>R2 → Manage R2 API Tokens → Create API Token</strong>.
            Select <em>Object Read &amp; Write</em>, optionally scope it to your bucket.
            Copy the <strong style={{ color: '#f4f4f5' }}>Access Key ID</strong> and{' '}
            <strong style={{ color: '#f4f4f5' }}>Secret Access Key</strong> — the secret is shown only once.
          </li>
          <li>
            <strong style={{ color: '#f4f4f5' }}>Add env vars to <code>.env.local</code></strong>:
            <pre style={{ background: '#1c1c1e', border: '1px solid #3a3a3c', borderRadius: 6, padding: '10px 14px', marginTop: 6, fontSize: 12, color: '#f4f4f5', overflowX: 'auto' }}>{`CLOUDFLARE_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=field-tech-files

# Optional: set if the bucket has public access via a custom domain
# R2_PUBLIC_URL=https://files.yourdomain.com`}</pre>
          </li>
          <li>
            <strong style={{ color: '#f4f4f5' }}>Set the Company Bucket ID</strong> above — enter a short,
            unique slug for this company (e.g. <code>acme-irrigation</code>). Photos will be stored at{' '}
            <code>acme-irrigation/zones/&lt;zone&gt;/&lt;file&gt;</code> within your bucket.
          </li>
        </ol>
      </section>
    </main>
  )
}
