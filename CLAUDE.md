# Agent Instructions

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
4. **Commit and push** all changes once build and tests pass:
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

## Testing expectations

- Every code change must either add new unit tests or update existing ones to cover the changed behavior.
- Unit tests go in `__tests__/` and must not require a database (`*.test.ts` or `*.test.tsx`).
- Integration tests go in `__tests__/` as `*.integration.test.ts` and use `withRollback()` for isolation.
- Do not leave new code paths untested.
- Write tests for Server Actions, API route handlers, and utility functions.
- Co-locate component tests with source files (`component.test.tsx` next to `component.tsx`) when appropriate.

## Running tests

| Command           | What it runs                          |
|-------------------|---------------------------------------|
| `npm test`        | Unit tests only — fast, no DB         |
| `npm run test:db` | DB integration tests — requires local Postgres |

---

## Project conventions

- **TypeScript strict mode** — fix type errors, never use `any` unless absolutely unavoidable (add a comment explaining why if you must).
- **Next.js 15 App Router** — all routes are in `app/`.
- **Clerk v7 for auth** — use `Show when="signed-in/out"` components, not the removed `SignedIn/SignedOut`.
- **Database ORM** is Drizzle ORM with PostgreSQL — see the Drizzle section below for conventions.

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
- clear descriptive variable and function names
- prefer smaller human readable functions
- follow investion of control and dependency injection principles
- ensure greater than 90 % unit test code coverage
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
- Apply migrations:
  ```bash
  npx drizzle-kit migrate
  ```
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

## Multi-Tenancy Invariant

This is a multi-tenant SaaS app. Every table (except `companies`) carries a `companyId` foreign key that ties each row to exactly one customer company. **This invariant must never be violated.**

### Rules

1. **Every query must filter by `companyId`.** No SELECT, UPDATE, or DELETE may touch rows without `AND company_id = $companyId` in the WHERE clause (or an equivalent Drizzle `.where` condition).
2. **Every insert must include `companyId`.** Never insert a row without explicitly setting `companyId` — the DB enforces `NOT NULL` on all tenant-scoped tables as a last line of defence.
3. **Get `companyId` from auth, never from user input.** Always call `getRequiredCompanyId()` from `lib/tenant.ts` at the top of every Server Action, Route Handler, and Server Component that touches the DB. Never accept a `companyId` from form data or request bodies.
4. **`getRequiredCompanyId()` is the single source of truth.** It reads the Clerk `orgId`, looks up the `companies` table, and auto-provisions the company row on first access. Import it from `@/lib/tenant`.
5. **Update/delete mutations need the guard too.** Use `and(eq(table.companyId, companyId), eq(table.id, id))` in WHERE clauses — this prevents cross-tenant mutation even if a client sends a foreign ID.
6. **Integration tests.** Use `TEST_COMPANY_ID` from `test/helpers/db.ts` for all DB fixtures. Tests that call server actions must mock `@/lib/tenant` via `jest.mock('@/lib/tenant', () => ({ getRequiredCompanyId: jest.fn() }))`.

### Common files

| File | Role |
|---|---|
| `lib/tenant.ts` | `getRequiredCompanyId()` — the only place that reads Clerk `orgId` |
| `lib/schema.ts` | Every table definition — check that new tables include `companyId` |
| `test/helpers/db.ts` | `TEST_COMPANY_ID` — used in all integration tests |

---

## Security

- Validate and sanitize all user inputs on the server — never trust the client.
- Use `zod` schemas as the single source of truth for input validation.
- Never expose database models or internal IDs directly to the client — use DTOs.
- Auth checks go in Server Components, Server Actions, and Route Handlers — not only middleware.
- Use `httpOnly` cookies for session tokens.
