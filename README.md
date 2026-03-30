# Irrigation Checkup App

A Next.js field service app for logging irrigation system inspections and generating PDF reports. Protected by Clerk authentication.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Auth | Clerk v7 |
| Database | PostgreSQL via `pg` |
| PDF generation | Puppeteer (headless Chromium) |
| Hosting | Railway |

---

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Then fill in `.env.local`:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Set to `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Set to `/` |
| `DATABASE_URL` | Railway → Postgres service → Variables |
| `PUPPETEER_EXECUTABLE_PATH` | Path to Chrome/Chromium on your machine |

**Finding your local Chrome path (macOS):**
```bash
# Chrome
/Applications/Google Chrome.app/Contents/MacOS/Google Chrome

# Chromium (if installed via Homebrew)
which chromium
```

### 3. Start the dev server

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

### `npm run dev`
Starts the Next.js development server with hot reload.

### `npm run build`
Compiles the app for production. Run this to catch TypeScript errors before deploying.

### `npm start`
Starts the compiled production server. Requires `npm run build` first.

### `npm test`
Runs unit tests (fast, no database needed).

Covers:
- Clerk component exports — guards against using removed/renamed components that cause runtime crashes

```bash
npm test
```

### `npm run test:db`
Runs database integration tests against a real local PostgreSQL instance.

Each test runs inside a transaction that is rolled back after — no leftover data between tests.

**Requires local Postgres to be running first:**

```bash
# Install (macOS)
brew install postgresql@16
brew services start postgresql@16

# Create the test database (one time)
createdb irrigation_test

# Run the tests
npm run test:db
```

If you want to use a different database URL, override it:
```bash
DATABASE_URL_TEST=postgresql://user:pass@host:5432/mydb npm run test:db
```

If Docker Desktop is running and you haven't set `DATABASE_URL_TEST`, the test helper will spin up a throwaway Postgres container automatically.

### `npm run db:migrate`
Runs schema migrations against the production database (creates tables if they don't exist). Use this to initialize the database schema on deployment.

**Locally:**
```bash
npm run db:migrate
```

**On Railway:** Runs automatically during `docker build` (see Dockerfile).

Idempotent — safe to run multiple times. Uses `CREATE TABLE IF NOT EXISTS` so it won't error if tables already exist.

### `npm run db:migrate:test`
Runs schema migrations against the test database (creates tables if they don't exist). Normally this runs automatically inside `test:db`, but you can run it manually to inspect or reset the test DB schema.

---

## Project Structure

```
app/
  layout.tsx              # Root layout — Clerk provider, nav, footer
  page.tsx                # Checkup form (main feature)
  clients/
    page.tsx              # Client list + add client form
  sign-in/[[...sign-in]]/
    page.tsx              # Clerk hosted sign-in page
  api/
    generate-pdf/
      route.ts            # POST — accepts form data, returns PDF binary
    clients/
      route.ts            # GET (list) + POST (add) clients

lib/
  db.ts                   # Postgres connection pool + schema init (initDb)
  irrigation-pdf.ts       # HTML template function for PDF generation

test/
  helpers/
    db.ts                 # Test DB lifecycle: startTestDb, stopTestDb, withRollback
    factories.ts          # Faker-based test data builders (buildClient)

__tests__/
  layout.test.tsx         # Unit tests — Clerk import validation
  clients.integration.test.ts  # DB integration tests for client CRUD

middleware.ts             # Clerk auth middleware — protects all routes except /sign-in
```

---

## Database

### Schema

The schema is managed inline in `lib/db.ts → initDb()`. It runs `CREATE TABLE IF NOT EXISTS` on first request, so no separate migration step is needed in production.

**`clients` table:**

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL | Primary key |
| `name` | TEXT | NOT NULL |
| `address` | TEXT | |
| `phone` | TEXT | |
| `email` | TEXT | |
| `account_type` | TEXT | Commercial / Residential / HOA / Municipal |
| `account_number` | TEXT | |
| `created_at` | TIMESTAMPTZ | Defaults to NOW() |

### Connecting locally to Railway Postgres

To connect to the Railway database from your machine (e.g. with a GUI like TablePlus):

1. Go to Railway → your Postgres service → Connect
2. Use the connection string shown under "Public networking"

---

## Deployment (Railway)

The app deploys via the `Dockerfile` at the project root. Railway builds and runs it automatically on push to the connected branch.

**Automatic schema initialization:** The Dockerfile runs `npm run db:migrate` after building, so your database schema (tables) is initialized automatically during deployment. No manual migration steps needed.

**Environment variables to set in Railway:**

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
DATABASE_URL=         ← linked automatically if Postgres service is attached
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

To link the Railway Postgres to the app service: Railway dashboard → your app service → Variables → "Add Reference" → select the Postgres `DATABASE_URL`.

**If you need to manually trigger migrations on Railway:**

Call the init endpoint:
```bash
curl -X POST https://your-app.railway.app/api/init
```

This runs `CREATE TABLE IF NOT EXISTS` for all tables. Safe to call anytime — idempotent.

---

## Authentication

Auth is handled by [Clerk](https://clerk.com). All routes are protected by default. Users must sign in to access the app.

- Sign-in page: `/sign-in`
- To invite a new user: Clerk Dashboard → Users → Invite
- To restrict registration (invitation-only): Clerk Dashboard → your app → Restrictions → "Invitation only"

---

## Testing Philosophy

| Test type | Command | Speed | Needs DB? |
|---|---|---|---|
| Unit (`*.test.ts`) | `npm test` | ~0.2s | No |
| Integration (`*.integration.test.ts`) | `npm run test:db` | ~0.5s | Yes |

**Integration test isolation:** each test runs inside a `BEGIN` / `ROLLBACK` transaction via `withRollback()` in `test/helpers/db.ts`. No `TRUNCATE` or `DELETE` is used — the database is always left clean.
