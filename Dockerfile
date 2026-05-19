# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder

# Prevent Playwright's postinstall from downloading browser binaries we don't need
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
ENV NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL

RUN npm run build

# Reinstall without devDependencies — these production node_modules go into the runner.
# tsx (needed for migration) and drizzle-orm are in dependencies, so they're included.
RUN npm ci --omit=dev

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-slim AS runner

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    # Cap Node.js heap to keep idle memory predictable on Railway
    NODE_OPTIONS="--max-old-space-size=256"

WORKDIR /app

# Production node_modules (no jest, playwright, drizzle-kit, TypeScript compiler, etc.)
COPY --from=builder /app/node_modules ./node_modules

# Standalone server entry point
COPY --from=builder /app/.next/standalone/server.js ./server.js

# Compiled server-side app files (RSC bundles, page manifests, etc.)
COPY --from=builder /app/.next/standalone/.next ./.next

# Static assets and public dir are excluded from standalone output — copy manually
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Migration script + drizzle SQL migrations + package.json (for npm run db:migrate)
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Run DB migrations at startup then launch the standalone server
CMD ["sh", "-c", "npm run db:migrate && node server.js"]
