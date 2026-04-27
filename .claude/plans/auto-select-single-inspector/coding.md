# Coding Instructions: auto-select-single-inspector

## Goal

When a company has exactly one inspector, auto-select them and skip the dropdown entirely. When there are two or more, keep the current `<select>` behaviour unchanged.

**File to change**: `app/irrigation-form.tsx` only. No schema, no server actions, no validators.

---

## Change 1 — Auto-select in the `useState` initialiser

**Location**: `app/irrigation-form.tsx`, the `useState` that initialises `form` (~line 58).

Current:
```ts
const [form, setForm] = useState(() => initialData?.form ?? {
  ...
  inspectorId: '',
  ...
})
```

Replace `inspectorId: ''` with a conditional:

```ts
inspectorId: inspectors.length === 1 ? inspectors[0].id : '',
```

This means:
- New inspection with 1 inspector → pre-selected immediately, no user action required
- New inspection with 0 or 2+ inspectors → blank, user must choose (unchanged)
- Edit inspection (`initialData` present) → `initialData.form.inspectorId` is used as-is (unchanged — the `?? { ... }` branch is not taken)

---

## Change 2 — Conditional rendering in the Inspector section

**Location**: `app/irrigation-form.tsx`, the "INSPECTOR" JSX section (~line 514).

Current markup renders a `<select>` unconditionally. Replace it with a conditional:

**When `inspectors.length === 1`** — render static text (same visual style as the License # box below it):

```tsx
{/* INSPECTOR */}
<section className="card">
  <h2>Inspected By</h2>
  <div className="grid-2">
    <div className="field">
      <label>Inspector</label>
      {inspectors.length === 1 ? (
        <p style={{
          padding: '7px 10px', border: '1px solid #3a3a3c', borderRadius: 6,
          fontSize: 13, color: '#ffffff', background: '#2c2c2e', margin: 0,
        }}>
          {inspectors[0].firstName} {inspectors[0].lastName}
        </p>
      ) : (
        <select
          value={form.inspectorId}
          onChange={e => setField('inspectorId', e.target.value)}
          disabled={mode === 'readonly'}
        >
          <option value="">— Select Inspector —</option>
          {inspectors.map(i => (
            <option key={i.id} value={String(i.id)}>
              {i.firstName} {i.lastName}
            </option>
          ))}
        </select>
      )}
    </div>
    {selectedInspector && (
      /* License # block — unchanged */
    )}
  </div>
</section>
```

Key points:
- The `<p>` uses the exact same inline style as the License # display already in the form — visually consistent
- The static text case does **not** need `disabled` — there is no input at all
- The `selectedInspector` derived value still works correctly because Change 1 sets `inspectorId` to `inspectors[0].id` when there is one inspector, so `selectedInspector` will be non-null and the License # block will render

---

## Pre-commit checklist

```bash
npm run build   # must pass
npm test        # must pass
```

No migration, no DB changes, no new files — just the two edits above.

---

## Files Modified

| File | Change |
|---|---|
| `app/irrigation-form.tsx` | Auto-select `inspectorId` when 1 inspector; conditional dropdown vs static text rendering |
