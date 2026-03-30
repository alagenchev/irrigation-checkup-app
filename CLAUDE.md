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

Both must pass before considering work complete.

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

## Security

- Validate and sanitize all user inputs on the server — never trust the client.
- Use `zod` schemas as the single source of truth for input validation.
- Never expose database models or internal IDs directly to the client — use DTOs.
- Auth checks go in Server Components, Server Actions, and Route Handlers — not only middleware.
- Use `httpOnly` cookies for session tokens.
