# Code Review Instructions — inspection-new-site-reset

**UUID**: `c7d8e9f0-a1b2-4c3d-8e4f-5a6b7c8d9e0f`
**Agent**: Code Review Agent (fresh session, sonnet model)

## What to Review

Changes to `app/irrigation-form.tsx` from the coding phase of `inspection-new-site-reset`.

Run:
```
git diff main -- app/irrigation-form.tsx
```

---

## Review Checklist

### Correctness
- [ ] All five client fields (clientName, clientAddress, clientEmail, accountType, accountNumber) are cleared when switching to 'new' mode
- [ ] Site fields (siteName, siteAddress) are still cleared (existing behaviour preserved)
- [ ] Equipment reset still happens (controllers/zones/backflows reinitialised)
- [ ] `clientLocked` is set to `false` on new-site mode (existing, preserved)
- [ ] Switching back to 'existing' mode still clears `siteSelected` (existing, preserved)

### Regressions
- [ ] Selecting an existing site still populates client fields via `handleSiteSelect`
- [ ] Equipment is locked when an existing site is selected (`setEquipmentLocked(true)`)
- [ ] Form submission (`handleSubmit`) still reads client fields correctly

### Code Quality
- [ ] No unnecessary state duplication
- [ ] `setField` calls match the exact field keys used in initial state (`clientEmail`, not `email`)
- [ ] No dead code introduced

### Blocking Issues (BLOCKER / MAJOR / MINOR)
- BLOCKER: any field that should be cleared but isn't
- BLOCKER: regression in existing-site population
- MAJOR: equipment section hidden behind wrong condition
- MINOR: style or naming inconsistency

---

## Verdict

Return one of: APPROVED / APPROVED_WITH_MINOR / BLOCKED (list issues)
