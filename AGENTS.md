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

## After every code change

1. **Run the build** to catch TypeScript and compilation errors:
   ```bash
   npm run build
   ```
2. **Run unit tests** to catch regressions:
   ```bash
   npm test
   ```
3. **If `scripts/` was modified**, run the migration test to verify it executes without runtime errors:
   ```bash
   npm run test:migrate
   ```
4. **If `lib/schema.ts` was modified**, apply the migration to the local database and verify it with the integration test suite before pushing:
   ```bash
   npx drizzle-kit generate          # generate the migration file
   DATABASE_URL=postgresql://localhost:5432/irrigation_test npx tsx scripts/migrate.ts  # apply locally
   npm run test:db                   # must pass — confirms the schema and queries work end-to-end
   ```
   Never leave the local DB behind the migration history, and never push a migration that hasn't been tested locally.
5. **Commit and push** all changes once build and tests pass:
   ```bash
   git add <relevant files>
   git commit -m "..."
   git push
   ```

All must pass before committing. Always commit and push — never leave implemented work uncommitted.

**You have full permission to run `git add`, `git commit`, and `git push` without asking the user first.** Do not ask for confirmation before committing or pushing.

### Critical: always check for unstaged changes before finishing

Before considering any task complete, run `git status` and confirm there are **no modified or untracked files** that belong to the feature. Partial commits — where some files in a feature are staged but others are left behind — cause CI/production builds to fail while the local build passes (because the local working tree has the full change).

**Common files that get missed:**
- `lib/schema.ts` — schema changes
- `lib/validators.ts` — Zod schema changes
- `types/index.ts` — TS type changes
- `drizzle/*.sql` and `drizzle/meta/` — generated migrations
- New `actions/*.ts` files
- New `app/**/*.tsx` page/component files

Run `git status` after every `git commit` to verify the working tree is clean. If anything is unstaged, commit it immediately in a follow-up commit rather than leaving it behind.

---

## Scripts in `scripts/` — CJS compatibility rule

**Never use top-level `await` in `scripts/*.ts`.** The scripts are run by `tsx` in CommonJS mode (no `"type": "module"` in `package.json`), and top-level await is not supported in CJS.

**Always wrap async work in an explicit `main()` function:**

```ts
// ✅ correct
async function main() {
  await someAsyncThing()
}
main().catch(err => { console.error(err); process.exit(1) })

// ❌ wrong — fails at runtime on Railway with "Top-level await is not supported with CJS"
await someAsyncThing()
```

This error does NOT surface during `npm run build` (Next.js doesn't compile `scripts/`) and is only caught at container startup on Railway. Run `npm run test:migrate` locally to catch it before pushing.

---

## Commands

```bash
npm run build   # TypeScript compile + Next.js production build — must pass before commit
npm test        # Jest unit tests (no DB required) — must pass before commit
npm run test:db # Integration tests (requires local Postgres)
npx drizzle-kit generate  # After any schema change — generates SQL migration
npx drizzle-kit migrate   # Apply pending migrations
```

---

## Critical: Multi-Tenancy Invariant

Every table except `companies` carries `companyId NOT NULL`. **All queries must filter by `companyId`. This is non-negotiable.**

### Rules

1. Call `getRequiredCompanyId()` from `@/lib/tenant` at the top of every Server Action, Route Handler, and Server Component that touches the DB.
2. Never accept `companyId` from form data or request bodies — always derive it from auth.
3. Every `INSERT` must include `companyId`.
4. Every `SELECT / UPDATE / DELETE` must include `AND company_id = $companyId` — use `and(eq(table.companyId, companyId), ...)`.
5. **Update/delete mutations need the guard too.** Use `and(eq(table.companyId, companyId), eq(table.id, id))` in WHERE clauses — this prevents cross-tenant mutation even if a client sends a foreign ID.
6. Integration tests mock `@/lib/tenant`: `jest.mock('@/lib/tenant', () => ({ getRequiredCompanyId: jest.fn().mockResolvedValue(TEST_COMPANY_ID) }))`.

```ts
// Every server action looks like this:
export async function doSomething(input: Input) {
  const companyId = await getRequiredCompanyId()   // ← always first
  // all DB calls below include companyId in WHERE / VALUES
}
```

### Common files

| File | Role |
|---|---|
| `lib/tenant.ts` | `getRequiredCompanyId()` — the only place that reads Clerk `orgId` |
| `lib/schema.ts` | Every table definition — check that new tables include `companyId` |
| `test/helpers/db.ts` | `TEST_COMPANY_ID` — used in all integration tests |

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
DATABASE_URL=postgresql://localhost:5432/irrigation_test npx tsx scripts/migrate.ts  # apply locally
```

**Always apply the migration to the local DB immediately after generating it.** The local `irrigation_test` database and Railway must always run the same schema. Never leave them out of sync.

**Test every migration and SQL change against the local instance before pushing.** After applying a migration locally, run the integration test suite to confirm the schema works correctly end-to-end:

```bash
npm run test:db   # integration tests against local Postgres — must pass before pushing
```

Never push a migration that has not been successfully applied and tested locally first. If a migration fails locally, fix it before pushing — Railway will run the same SQL and will also fail.

Commit **all** of: `lib/schema.ts`, `lib/validators.ts`, `types/index.ts`, any affected actions, the new `drizzle/*.sql`, and `drizzle/meta/`. Partial commits cause production builds to fail while local builds pass.

### Drizzle-kit SQL generation caveat

`drizzle-kit generate` occasionally emits invalid PostgreSQL when altering column types — for example `ALTER COLUMN "id" SET DATA TYPE serial` (`serial` is a pseudo-type and cannot be used in ALTER). If a migration fails with `type "serial" does not exist`, replace that statement with the correct sequence idiom:

```sql
-- Instead of: ALTER TABLE "t" ALTER COLUMN "id" SET DATA TYPE serial;
CREATE SEQUENCE "t_id_seq";
ALTER TABLE "t" ALTER COLUMN "id" SET DEFAULT nextval('"t_id_seq"');
ALTER SEQUENCE "t_id_seq" OWNED BY "t"."id";
```

Also remove any `ALTER COLUMN "id" DROP DEFAULT` line that follows — the sequence default must be kept.

---

## Testing conventions

- Unit tests in `__tests__/*.test.ts` — no DB, no network. Mock `@/lib/db` and `@/lib/tenant`.
- Integration tests in `__tests__/*.integration.test.ts` — use `withRollback()` for isolation.
- Every new code path needs a test. Target >90% unit test coverage.
- `form-data-types.test.ts` — type-shape tests; update when adding fields to form data types.
- Write tests for Server Actions, API route handlers, and utility functions.
- Co-locate component tests with source files (`component.test.tsx` next to `component.tsx`) when appropriate.
- Never share DB state between tests — each test must be fully isolated.
- Mock `db` in unit tests — only hit the real DB in `*.integration.test.ts` files.

| Command           | What it runs                          |
|-------------------|---------------------------------------|
| `npm test`        | Unit tests only — fast, no DB         |
| `npm run test:db` | DB integration tests — requires local Postgres |

---

## R2 photo storage

- Bucket ID (`r2CompanyBucketId`) is a UUID auto-generated at company provisioning — never user-visible, never overwritten.
- Object key pattern: `{r2CompanyBucketId}/zones/{zoneNum}/{timestamp}_{filename}`
- Required env vars: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. Optional: `R2_PUBLIC_URL`.
- `R2_ENDPOINT` is the jurisdiction-specific S3 endpoint from the R2 dashboard (e.g. `https://<account-id>.eu.r2.cloudflarestorage.com`). Found at: Cloudflare Dashboard → R2 → your bucket → Settings → S3 API.
- See `lib/r2.ts` for the client implementation.

---

## Clerk auth notes

- Use `SignedIn` / `SignedOut` components from `@clerk/nextjs` — `Show` is not exported.
- `getRequiredCompanyId()` in `lib/tenant.ts` reads `auth().orgId` and resolves it to the internal `companies.id`. It auto-provisions the company row on first call.
- **Organizations are required** — every user must belong to a Clerk org to use the app. The org ID is the multi-tenancy boundary.

### Customer-facing branding (UX requirements)

**Never expose Clerk terminology to customers.** They don't care about "organizations" or "Clerk." Use business language instead:

- Never show "Clerk" branding or logos on your UI
- Never say "Organization" — say "Company", "Team", "Account", or "Workspace" (pick one term and use consistently)
- Custom sign-up/login forms branded as the app, not Clerk
- "Invite team member" button in your app (not "Invite to Clerk org")
- When they sign up, auto-create a Clerk org in the background silently
- Invite acceptance link: `yourapp.com/join?token=xyz` (not a Clerk domain)
- Settings page shows their team/company members, not "Clerk organization members"

This is a **future implementation** requirement. For now, the Clerk org machinery is correct — just document that the UX must be hidden.

### Handling existing users without orgs

If a user signed up before orgs were required, they exist in Clerk but have no `orgId`. They will see: "No organisation context" error.

**Temporary fix (manual):**
1. Clerk dashboard → Organizations → Create organization (name it after their company)
2. Copy the org ID (`org_...`)
3. Members → Invite → add their email
4. They accept the invite
5. Prod DB: `UPDATE companies SET clerk_org_id = 'org_...' WHERE clerk_org_id = '__pending_claim__';`
6. They log in again → works

**Permanent fix (sketch in progress):**
Build an onboarding flow:
- `app/onboard/page.tsx` — form to collect company name (sketch exists)
- `app/api/onboard/create-org/route.ts` — backend to create Clerk org and add user (sketch exists)
- Middleware (`middleware.ts`) — redirect signed-in users without `orgId` to `/onboard`

The sketch is a starting point. When implementing, add:
- Form validation improvements
- Error handling for org creation failures
- Optional company details (logo, address, etc.)
- Success message or progress indicator
- Link back to home after org is created

---

## Seat-based billing — planned (not yet implemented)

These decisions are made and should be followed when implementing seat billing.

### Architecture

| Concern | Owner |
|---|---|
| User login / sessions | Clerk |
| Org identity (`clerkOrgId`) | Clerk → mapped to `companies.id` in the DB |
| Who is a member of which org | Clerk |
| How many seats a company is allowed | DB (`company_settings.max_seats`) |
| Whether a seat is available before inviting | App code (checked before sending Clerk invite) |
| Billing / subscription state | DB (synced from Stripe webhooks) |

### Seat limit enforcement

- Add `max_seats integer NOT NULL DEFAULT 1` to `company_settings`.
- Before sending a Clerk org invite, query the Clerk Backend API for current member count and compare against `max_seats`. Reject with an upgrade prompt if at the limit.
- Do **not** rely on Clerk's `max_allowed_memberships` setting to enforce limits — enforce in app code only. Set the Clerk dashboard default to a large number (e.g. 100) to stay out of the way.
- Upgrading a plan = update `max_seats` in the DB. No Clerk API call needed.

### Clerk → DB sync (webhooks)

Add a webhook handler at `POST /api/webhooks/clerk`. Verify the payload with the `svix` library using `CLERK_WEBHOOK_SECRET`.

Handle these events:
- `organizationMembership.created` — a seat was consumed (can trigger usage tracking or emails)
- `organizationMembership.deleted` — a seat was freed
- `organization.deleted` — cascade-delete the company (or mark it inactive)

Do not duplicate membership data in the DB — Clerk is the source of truth for who is in an org. The webhook is only for reacting to changes, not for storing a copy of the member list.

### Plans

- **Beginner**: 1 seat included.
- Additional seats charged on top. Exact pricing TBD — implement when billing is added.

---

## TypeScript

- Always use strict TypeScript (`"strict": true` in tsconfig).
- Prefer `type` for unions/primitives/function signatures; use `interface` for object shapes that may be extended.
- Never use `any`. Use `unknown` and narrow it, or define a proper type.
- Avoid type assertions (`as SomeType`) unless you have no alternative — add a comment explaining why.
- Use the `satisfies` operator to validate literals without widening the type.
- Export types and interfaces from a dedicated `types/` directory or co-located `*.types.ts` files.
- Use discriminated unions for state modeling:
  ```ts
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: T }
  ```

---

## Next.js Architecture

- Use the **App Router** (`app/`) for all routes — never the Pages Router.
- Default to **Server Components**. Only add `'use client'` when you need:
  - Browser APIs (`window`, `document`, `localStorage`)
  - Event handlers (`onClick`, `onChange`)
  - React hooks (`useState`, `useEffect`, `useContext`)
- Co-locate route files: each route folder should contain its `page.tsx`, `loading.tsx`, `error.tsx`, and route-specific components.
- Use **Route Handlers** (`app/api/.../route.ts`) for API endpoints.
- Use **Server Actions** for form mutations and data writes — prefer them over client-side fetch to API routes.
- Use `next/image` for all images — never raw `<img>` tags.
- Use `next/link` for all internal navigation — never `<a>` for client-side routes.
- Use `next/font` for font loading — never CSS `@import` or `<link>` for fonts.
- Never put secrets in client components or expose them via `NEXT_PUBLIC_` unless truly public.

---

## Data Fetching

- Fetch data in **Server Components** by default.
- Avoid waterfalls — fetch in parallel with `Promise.all`.
- Use React `cache()` and Next.js `revalidatePath` / `revalidateTag` for caching strategy.
- Pass fetched data down as props — don't re-fetch in child components unnecessarily.
- Always handle loading and error states with `loading.tsx` and `error.tsx` boundaries.

---

## React Best Practices

- Keep components small and single-responsibility. If a component exceeds ~150 lines, break it up.
- Prefer **composition over prop drilling** — use children, slots, and context for deep prop needs.
- Use `useCallback` and `useMemo` only when there is a measurable performance reason — don't prematurely optimize.
- Derive state from props/existing state rather than syncing with `useEffect` when possible.
- Avoid `useEffect` for data fetching in App Router apps — use Server Components instead.
- Use `useReducer` for complex, related state instead of multiple `useState` calls.
- Always provide stable `key` props in lists — never use array index as key if the list can reorder.
- Prefer **controlled components** for form inputs.

---

## File & Folder Structure

```
app/
  (marketing)/         ← route groups for layout isolation
  dashboard/
    page.tsx
    loading.tsx
    error.tsx
components/
  ui/                  ← generic, reusable primitives (Button, Modal, etc.)
  feature/             ← feature-specific components
lib/
  db.ts                ← Drizzle client instance (export `db`)
  schema.ts            ← all Drizzle table definitions
  auth.ts
  utils.ts
types/
  index.ts
hooks/                 ← custom hooks (client-side only)
actions/               ← server actions
drizzle/               ← generated migrations (do not edit manually)
__tests__/             ← unit and integration tests
```

---

## Naming Conventions

- **Files**: `kebab-case.tsx` for components (`user-profile.tsx`).
- **Components**: `PascalCase` named exports — no default exports for components (harder to refactor/search).
- **Hooks**: `useCamelCase`.
- **Types/Interfaces**: `PascalCase`.
- **Constants**: `SCREAMING_SNAKE_CASE` for true constants; `camelCase` for config objects.
- **Server Actions**: prefix with a verb (`createUser`, `deletePost`, `updateSettings`).
- Clear descriptive variable and function names.
- Prefer smaller human readable functions.
- Follow inversion of control and dependency injection principles.
- Ensure greater than 90% unit test code coverage.

---

## Error Handling

- Use typed error classes or discriminated union results for server actions and API calls:
  ```ts
  { ok: true; data: T } | { ok: false; error: string }
  ```
- Always add `error.tsx` boundaries at meaningful route segments.
- Never swallow errors silently — log them or surface them to the user.
- Validate all external input (API payloads, form data) with **Zod** before using it.
- All async functions must have error handling — no fire-and-forget without a `.catch()`.

---

## Performance

- Use `React.lazy` + `Suspense` for heavy client-side components.
- Use `dynamic()` from `next/dynamic` with `{ ssr: false }` for browser-only third-party libraries.
- Avoid large client-side bundles — prefer Server Components for static/read-only UI.
- Analyze bundle size periodically with `@next/bundle-analyzer`.

---

## Code Quality

- No `console.log` in committed code — use a proper logger or remove before committing.
- Functions should do one thing. If a name uses "and," split it into two functions.
- Prefer early returns (guard clauses) over deeply nested conditionals.
- No `any` — see TypeScript section above.

---

## UI & Color — Readability Rules

This app uses a **dark theme**. All UI must meet these contrast and color rules:

### Text on dark backgrounds
- Body / primary text: `#ffffff` or `#f4f4f5` — never dark gray or black on dark backgrounds.
- Secondary / hint text: `#a1a1aa` minimum — light enough to read but visually subordinate.
- Disabled / placeholder text: `#71717a` — use sparingly; never for content the user must read.

### Interactive overlays (dropdowns, modals, tooltips, popovers)
- Background: `#1c1c1e` (near-black surface).
- Text: `#ffffff` — always set explicitly; never rely on inheritance from the page which may have a different context.
- Hover / active highlight: `#2c2c2e`.
- Border: `#3a3a3c`.

### Status colors
| Purpose | Color |
|---|---|
| Error / destructive | `#ef4444` |
| Success | `#22c55e` |
| Warning | `#f59e0b` |
| Info / accent | `#3b82f6` |

### Rules
- **Always set `color` explicitly on floating elements** (dropdowns, tooltips, modals). Do not rely on CSS inheritance — the parent context may use a different color scheme and cause unreadable dark-on-dark or light-on-light combinations.
- **Never use black (`#000000`) text** on dark backgrounds.
- **Minimum contrast ratio: 4.5:1** for normal text, 3:1 for large text (WCAG AA).
- **Test readability visually** whenever adding any overlay or floating UI element.

---

## Database (Drizzle ORM + PostgreSQL)

### Setup & client

```ts
// lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client, { schema })
```

- Always import `db` from `lib/db.ts` — never instantiate a new client inline.
- Never import `db` in Client Components — database access is server-only (Server Components, Server Actions, Route Handlers).

### Schema

```ts
// lib/schema.ts
import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Infer types directly from the schema — do not write them by hand
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
```

- All table definitions live in `lib/schema.ts` — one file for the whole schema (split into `lib/schema/` subfolder only if it grows very large).
- Always infer types with `$inferSelect` / `$inferInsert` — never manually duplicate them as interfaces.
- Use `notNull()` explicitly on columns that must never be null.
- Use `defaultNow()` for `createdAt`; add `updatedAt` with `.$onUpdateFn(() => new Date())` where relevant.
- Use `references()` for foreign keys to enforce relational integrity at the DB level.

### Querying

```ts
import { db } from '@/lib/db'
import { users } from '@/lib/schema'
import { eq, and, desc } from 'drizzle-orm'

// Select
const user = await db.query.users.findFirst({ where: eq(users.id, id) })

// Insert
const [newUser] = await db.insert(users).values({ email }).returning()

// Update
await db.update(users).set({ email }).where(eq(users.id, id))

// Delete
await db.delete(users).where(eq(users.id, id))
```

- Prefer `db.query.*` (relational API) for reads with joins — it's type-safe and composable.
- Use `.returning()` after inserts/updates to get the resulting row back instead of making a second query.
- Never use raw SQL strings unless Drizzle cannot express the query — use `sql` tagged template from `drizzle-orm` if needed.
- Always narrow queries to the minimum columns needed with `.select({ id: users.id, email: users.email })` for large tables.

### Migrations

- Use **Drizzle Kit** for all schema migrations — never edit the database manually or write raw SQL migration files.
- Generate a migration after any schema change:
  ```bash
  npx drizzle-kit generate
  ```
- Apply the migration to the local database and verify it succeeds before pushing:
  ```bash
  DATABASE_URL=postgresql://localhost:5432/irrigation_test npx tsx scripts/migrate.ts
  npm run test:db   # must pass — confirms schema + queries work correctly
  ```
- **Never push a migration that has not been applied and tested locally.** If `npm run test:db` fails after applying a migration, fix the issue first.
- Never edit files inside `drizzle/` manually — they are the migration history.
- `drizzle.config.ts` lives at the project root and points to `lib/schema.ts`.

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

### Integration tests

- Use `withRollback()` (wraps each test in a transaction that rolls back) so tests never leave data in the DB.
- Never share DB state between tests — each test must be fully isolated.
- Mock `db` in unit tests — only hit the real DB in `*.integration.test.ts` files.

---

## Security

- Validate and sanitize all user inputs on the server — never trust the client.
- Use `zod` schemas as the single source of truth for input validation.
- Never expose database models or internal IDs directly to the client — use DTOs.
- Auth checks go in Server Components, Server Actions, and Route Handlers — not only middleware.
- Use `httpOnly` cookies for session tokens.
