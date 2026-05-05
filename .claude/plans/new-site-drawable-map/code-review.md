# Code Review — new-site-drawable-map

**UUID**: `d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a`
**Agent**: Code Review Agent (fresh session, sonnet)

## What to Review

```
git diff main -- app/sites/add-site-form.tsx
```

---

## Checklist

### Correctness
- [ ] `phase` state resets to `'equipment'` inside `handleDone` (so next add-site starts at phase 1)
- [ ] `SiteEquipmentEditor` `onSave` and `onClose` both transition to map phase (not call `handleDone`)
- [ ] `SiteMapEditor` `onClose` calls `handleDone` (returns to blank form)
- [ ] Skip equipment button transitions to map phase
- [ ] Skip map button calls `handleDone`
- [ ] `SiteMapEditor` receives the correct `siteId` from `createdSite.id`

### Regressions
- [ ] Equipment phase markup and `data-testid="add-site-equipment-phase"` preserved
- [ ] `data-testid="add-site-skip-equipment"` preserved on skip button
- [ ] Add Site form phase (`data-testid="add-site-form"`) unaffected

### Code Quality
- [ ] No unnecessary state — `phase` as `'equipment' | 'map'` is the minimal addition
- [ ] `SiteMapEditor` not wrapped in an extra `next/dynamic` (it handles that internally)
- [ ] No prop drilling or new context introduced

### Blocking Issues
- BLOCKER: `handleDone` not resetting `phase` → user gets stuck on map phase after second add
- BLOCKER: `SiteMapEditor` missing required props
- MAJOR: skip button calls wrong function
- MINOR: missing `data-testid` on map phase container

---

## Verdict

Return: APPROVED / APPROVED_WITH_MINOR / BLOCKED
