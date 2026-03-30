'use client'

import { useActionState } from 'react'
import { createClient } from '@/actions/clients'
import type { ActionResult, Client } from '@/types'

const ACCOUNT_TYPES = ['Commercial', 'Residential', 'HOA', 'Municipal']

export function AddClientForm() {
  const [state, formAction, isPending] = useActionState<ActionResult<Client> | null, FormData>(
    createClient,
    null,
  )

  return (
    <form action={formAction}>
      <div className="grid-3">
        <div className="field">
          <label>Name <span style={{ color: '#ef4444' }}>*</span></label>
          <input type="text" name="name" placeholder="Client name" required />
        </div>
        <div className="field">
          <label>Phone</label>
          <input type="text" name="phone" placeholder="(555) 000-0000" />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" name="email" placeholder="client@email.com" />
        </div>
        <div className="field">
          <label>Address</label>
          <input type="text" name="address" placeholder="123 Main St, City, TX" />
        </div>
        <div className="field">
          <label>Account Type</label>
          <select name="account_type" defaultValue="Residential">
            {ACCOUNT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Account Number</label>
          <input type="text" name="account_number" placeholder="Account #" />
        </div>
      </div>

      {state && !state.ok && (
        <p style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{state.error}</p>
      )}
      {state?.ok && (
        <p style={{ color: '#22c55e', fontSize: 13, marginTop: 10 }}>Client added successfully.</p>
      )}

      <div style={{ marginTop: 16 }}>
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? 'Saving…' : 'Add Client'}
        </button>
      </div>
    </form>
  )
}
