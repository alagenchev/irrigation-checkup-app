# context.md: autopopulate-client-on-site-select

**UUID**: c4d5e6f7-a8b9-4c0d-1e2f-3a4b5c6d7e8f

## Architecture Decisions

- Extended `SiteWithClient` type with 4 new nullable fields (clientPhone, clientEmail, clientAccountType, clientAccountNumber)
- `getSites()` query joins these from the clients table — no extra query needed
- `handleSiteSelect()` maps them to existing form fields: clientEmail → clientEmail, clientAccountType → accountType, clientAccountNumber → accountNumber
- `clientPhone` intentionally excluded — the new inspection form has no phone field in the client section
- `accountType` and `accountNumber` in the form are inspection-level fields that are pre-populated from the client's defaults; user can still edit them before saving

## Files Modified

- `actions/sites.ts` — extended SiteWithClient type + getSites() query (also fixed add-site-form.tsx to include new fields when constructing SiteWithClient on site creation)
- `app/irrigation-form.tsx` — handleSiteSelect() populates email, accountType, accountNumber
- `app/sites/add-site-form.tsx` — setCreatedSite() updated to include clientPhone, clientEmail, clientAccountType, clientAccountNumber fields (required to satisfy updated SiteWithClient type)

## Test IDs (data-testid attributes)

None added — no new interactive elements.

## Known Intentional Gaps

- `clientPhone` is not populated on site select because the new inspection form has no phone input in the client section. If a phone field is added later, wire it up here.
