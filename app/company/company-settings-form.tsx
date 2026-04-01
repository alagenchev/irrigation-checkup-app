'use client'

import { useActionState } from 'react'
import { upsertCompanySettings } from '@/actions/company-settings'
import type { ActionResult, CompanySettings } from '@/types'

interface CompanySettingsFormProps {
  initial: CompanySettings
}

const FIELDS: [keyof CompanySettings, string][] = [
  ['companyName',         'Company Name *'],
  ['licenseNum',          'License #'],
  ['companyAddress',      'Company Address'],
  ['companyCityStateZip', 'City / State / Zip'],
  ['companyPhone',        'Company Phone'],
  ['performedBy',         'Inspected By'],
]

export function CompanySettingsForm({ initial }: CompanySettingsFormProps) {
  const [state, formAction, isPending] = useActionState<ActionResult<CompanySettings> | null, FormData>(
    upsertCompanySettings,
    null,
  )

  return (
    <form action={formAction}>
      <div className="grid-2">
        {FIELDS.map(([key, label]) => (
          <div className="field" key={key}>
            <label>{label}</label>
            <input
              type="text"
              name={key}
              defaultValue={initial[key] as string ?? ''}
              required={key === 'companyName'}
            />
          </div>
        ))}
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label>R2 Company Bucket ID</label>
        <input
          type="text"
          name="r2CompanyBucketId"
          defaultValue={initial.r2CompanyBucketId ?? ''}
          placeholder="e.g. acme-irrigation"
          style={{ maxWidth: 320 }}
        />
        <p style={{ color: '#a1a1aa', fontSize: 12, marginTop: 4 }}>
          Unique identifier for this company&apos;s files within the shared R2 bucket (e.g. <code>acme-irrigation</code>).
          All uploaded photos will be stored under this prefix.
          See the <em>Cloudflare R2 Setup</em> section below for configuration steps.
        </p>
      </div>

      {state && !state.ok && (
        <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{state.error}</p>
      )}
      {state?.ok && (
        <p style={{ color: '#22c55e', fontSize: 13, marginTop: 10 }}>Company settings saved.</p>
      )}

      <div style={{ marginTop: 16 }}>
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
