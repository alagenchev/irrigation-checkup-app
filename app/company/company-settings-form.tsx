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
