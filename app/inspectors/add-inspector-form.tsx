'use client'

import { useActionState } from 'react'
import { createInspector } from '@/actions/inspectors'
import type { ActionResult, Inspector } from '@/types'

const FIELDS: [string, string, boolean][] = [
  ['firstName',  'First Name *', true],
  ['lastName',   'Last Name *',  true],
  ['email',      'Email',        false],
  ['phone',      'Phone',        false],
  ['licenseNum', 'License #',    false],
]

export function AddInspectorForm() {
  const [state, formAction, isPending] = useActionState<ActionResult<Inspector> | null, FormData>(
    async (_prev, fd) => createInspector({
      firstName:  fd.get('firstName')  as string,
      lastName:   fd.get('lastName')   as string,
      email:      (fd.get('email')      as string) || undefined,
      phone:      (fd.get('phone')      as string) || undefined,
      licenseNum: (fd.get('licenseNum') as string) || undefined,
    }),
    null,
  )

  return (
    <form action={formAction}>
      <div className="grid-2">
        {FIELDS.map(([name, label, required]) => (
          <div className="field" key={name}>
            <label>{label}</label>
            <input type="text" name={name} required={required} />
          </div>
        ))}
      </div>
      {state && !state.ok && (
        <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{state.error}</p>
      )}
      {state?.ok && (
        <p style={{ color: '#22c55e', fontSize: 13, marginTop: 10 }}>Inspector added.</p>
      )}
      <div style={{ marginTop: 16 }}>
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? 'Adding…' : 'Add Inspector'}
        </button>
      </div>
    </form>
  )
}
