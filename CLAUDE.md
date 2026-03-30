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

## Testing expectations

- Every code change must either add new unit tests or update existing ones to cover the changed behavior.
- Unit tests go in `__tests__/` and must not require a database (`*.test.ts` or `*.test.tsx`).
- Integration tests go in `__tests__/` as `*.integration.test.ts` and use `withRollback()` for isolation.
- Do not leave new code paths untested.

## Running tests

| Command | What it runs |
|---|---|
| `npm test` | Unit tests only — fast, no DB |
| `npm run test:db` | DB integration tests — requires local Postgres |

## Project conventions

- TypeScript strict mode — fix type errors, never use `any` unless absolutely unavoidable.
- Next.js 15 App Router — all routes are in `app/`.
- Clerk v7 for auth — use `Show when="signed-in/out"` components, not the removed `SignedIn/SignedOut`.
- Database schema lives in `lib/db.ts → initDb()` — add new tables there.
