# Agent Instructions — Irrigation Checkup App

## What this app is

A multi-tenant SaaS field-service tool for irrigation inspection companies. Technicians fill out inspection forms on-site; the app generates PDF reports, stores photos in Cloudflare R2, and tracks site equipment across visits.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router (TypeScript strict) |
| Database | PostgreSQL via Drizzle ORM |
| Auth / Tenancy | Clerk v7 (organisations = tenants) |
| Validation | Zod |
| File storage | Cloudflare R2 (`@aws-sdk/client-s3`) |
| PDF generation | Puppeteer via `/api/generate-pdf` route |

---

## Commands

```bash
npm run build   # TypeScript compile + Next.js production build — must pass before commit
npm test        # Jest unit tests (no DB required) — must pass before commit
npm run test:db # Integration tests (requires local Postgres)
npx drizzle-kit generate  # After any schema change — generates SQL migration
npx drizzle-kit migrate   # Apply pending migrations
```

**After every change: run `npm run build && npm test`, fix all errors, then commit and push. Never leave work uncommitted.**

---

## Critical: Multi-Tenancy Invariant

Every table except `companies` carries `companyId NOT NULL`. **All queries must filter by `companyId`. This is non-negotiable.**

### Rules

1. Call `getRequiredCompanyId()` from `@/lib/tenant` at the top of every Server Action, Route Handler, and Server Component that touches the DB.
2. Never accept `companyId` from form data or request bodies — always derive it from auth.
3. Every `INSERT` must include `companyId`.
4. Every `SELECT / UPDATE / DELETE` must include `AND company_id = $companyId` — use `and(eq(table.companyId, companyId), ...)`.
5. Integration tests mock `@/lib/tenant`: `jest.mock('@/lib/tenant', () => ({ getRequiredCompanyId: jest.fn().mockResolvedValue(TEST_COMPANY_ID) }))`.

```ts
// Every server action looks like this:
export async function doSomething(input: Input) {
  const companyId = await getRequiredCompanyId()   // ← always first
  // all DB calls below include companyId in WHERE / VALUES
}
```

---

## Key files

```
lib/
  schema.ts        All Drizzle table definitions + inferred types. Every table has companyId.
  validators.ts    All Zod schemas. Single source of truth for input shapes.
  r2.ts            Cloudflare R2 client (uploadToR2, deleteFromR2, r2PublicUrl).
  tenant.ts        getRequiredCompanyId() — the ONLY place that reads Clerk orgId.
  db.ts            Drizzle client singleton (export db).

actions/
  save-inspection.ts   Full form submission — syncs site equipment + upserts siteVisit.
  inspections.ts       getInspectionForEdit() — loads a visit back into form shape.
  upload.ts            uploadZonePhoto() — uploads to R2, reads r2CompanyBucketId from DB.
  company-settings.ts  getCompanySettings() auto-provisions row + UUID bucket ID on first call.
  sites.ts             ensureSiteExists() — find-or-create by name+address.
  clients.ts           ensureClientExists() — find-or-create by name.

app/
  irrigation-form.tsx  Main inspection form (client component ~900 lines).
  inspections/[id]/    Detail page — loads form in readonly mode via getInspectionForEdit.

types/index.ts         Re-exports DB types + UI-layer *FormData types.
drizzle/               Generated migrations — never edit manually.
__tests__/             Unit tests (*test.ts) and integration tests (*.integration.test.ts).
```

---

## Schema overview

```
companies           — tenant root; clerkOrgId maps Clerk org → company row
companySettings     — one row per company; r2CompanyBucketId auto-generated UUID
clients             — companyId FK
sites               — companyId FK; clientId optional FK
inspectors          — companyId FK; firstName + lastName + licenseNum
siteControllers     — companyId FK; site equipment, persists across visits
siteZones           — companyId FK; zone descriptions per site
siteBackflows       — companyId FK
siteVisits          — companyId FK; one per site+date; JSONB: zoneIssues, quoteItems, zonePhotos
```

`siteVisits` is the central record. Equipment tables (`siteControllers`, `siteZones`, `siteBackflows`) are fully replaced on every form save (delete-then-insert inside a transaction).

---

## Form data flow

1. **New inspection** — `IrrigationForm` initialises with today's date; user fills fields.
2. **Save** — `saveInspection(SaveInspectionInput)` validates with Zod, resolves site/client, syncs equipment in a DB transaction, upserts the visit row.
3. **Edit** — `getInspectionForEdit(siteVisitId)` reassembles the form data from DB; assigns ephemeral IDs to controllers so zone FK references work in the UI.
4. **Photos** — Upload/Capture buttons call `uploadZonePhoto(formData)` immediately on file select; R2 key stored in `zone.photoUrls` state; persisted in `siteVisits.zonePhotos` JSONB on save.

---

## Type safety pattern

Local form types in `irrigation-form.tsx` are **aliases** to the canonical `*FormData` types in `types/index.ts`:

```ts
type Controller = ControllerFormData   // NOT a duplicate inline definition
type Zone       = ZoneFormData
```

`__tests__/form-data-types.test.ts` has compile-time and runtime checks ensuring these stay in sync with the Zod schemas. If you add a field to `ControllerFormData`, you must also add it to `controllerRow` in `validators.ts` and vice versa.

---

## Migrations

After any `lib/schema.ts` change:

```bash
npx drizzle-kit generate   # creates drizzle/XXXX_*.sql
```

Commit **all** of: `lib/schema.ts`, `lib/validators.ts`, `types/index.ts`, any affected actions, the new `drizzle/*.sql`, and `drizzle/meta/`. Partial commits cause production builds to fail while local builds pass.

---

## Testing conventions

- Unit tests in `__tests__/*.test.ts` — no DB, no network. Mock `@/lib/db` and `@/lib/tenant`.
- Integration tests in `__tests__/*.integration.test.ts` — use `withRollback()` for isolation.
- Every new code path needs a test. Target >90% unit test coverage.
- `form-data-types.test.ts` — type-shape tests; update when adding fields to form data types.

---

## R2 photo storage

- Bucket ID (`r2CompanyBucketId`) is a UUID auto-generated at company provisioning — never user-visible, never overwritten.
- Object key pattern: `{r2CompanyBucketId}/zones/{zoneNum}/{timestamp}_{filename}`
- Required env vars: `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. Optional: `R2_PUBLIC_URL`.
- See `lib/r2.ts` for the client implementation.

---

## Clerk auth notes

- Use `Show when="signed-in"` / `Show when="signed-out"` — `SignedIn`/`SignedOut` are not exported in Clerk v7.
- `getRequiredCompanyId()` in `lib/tenant.ts` reads `auth().orgId` and resolves it to the internal `companies.id`. It auto-provisions the company row on first call.
