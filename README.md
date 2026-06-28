# GamePool

Sports coordination platform — find players, teammates, opponents, create matches, and play.

**Live stack:** Next.js 15 · PostgreSQL (Prisma) · Firebase Auth · Vercel · Sentry · Upstash Redis

---

## Table of contents

- [Run locally](#run-locally)
- [Deploy to production](#deploy-to-production)
- [How users access the app](#how-users-access-the-app)
- [Mobile: Android & iOS](#mobile-android--ios)
- [Recommended next steps](#recommended-next-steps)
- [Monorepo](#monorepo)
- [Scripts](#scripts)
- [Documentation](#documentation)

---

## Run locally

### Prerequisites

- **Node.js 20+**
- **pnpm 9+** (`npm install -g pnpm`)
- **Docker Desktop** (for local PostgreSQL)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/rishadrafeeq/gamepool.git
cd gamepool

# 2. Install dependencies
pnpm install

# 3. Start PostgreSQL
docker compose up -d

# 4. Environment variables
cp .env.example .env
# Fill in Firebase keys (see Firebase setup below), then on Windows also:
# Copy-Item .env apps/web/.env.local

# 5. Database
pnpm db:generate
pnpm db:migrate:dev
pnpm db:seed

# 6. Start dev server
pnpm dev
```

Open **http://localhost:3000**

| Check | URL |
|-------|-----|
| App | http://localhost:3000 |
| API health | http://localhost:3000/api/v1/health |
| Readiness (DB) | http://localhost:3000/api/v1/health/ready |
| Admin panel | http://localhost:3000/admin/login |

**Dev admin** (from seed): `admin@gamepool.local` / `changeme` — change in production.

### Firebase setup (required for sign-up)

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Email/Password** and **Phone** sign-in
3. Add **localhost** to **Authentication → Settings → Authorized domains**
4. Copy web app config → `NEXT_PUBLIC_FIREBASE_*` in `.env`
5. **Project settings → Service accounts → Generate new private key** → `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

> **Windows / Next.js:** Next.js reads `apps/web/.env.local` first. Keep it in sync with root `.env`:
> ```powershell
> Copy-Item .env apps/web/.env.local -Force
> ```
> Restart `pnpm dev` after env changes.

### Common local issues

| Problem | Fix |
|---------|-----|
| "Firebase is not configured" | Copy `.env` → `apps/web/.env.local`, restart dev server |
| "An unexpected error occurred" on sign-up | Start Docker: `docker compose up -d`, wait for Postgres healthy |
| Port 3000 in use | Stop the other process or change port in Next.js config |

---

## Deploy to production

GamePool is designed to deploy on **[Vercel](https://vercel.com)** with **Neon** (PostgreSQL), **Firebase**, and optional **Sentry** + **Upstash Redis**.

### Quick deploy checklist

1. **Fork / push** this repo to your GitHub account
2. **Vercel** → New Project → Import repo → set **Root Directory** to `apps/web`
3. **Neon** → Create database → copy pooled `DATABASE_URL` + direct `DIRECT_URL`
4. **Firebase** → Add your production domain to Authorized domains
5. Add all env vars from `.env.example` in Vercel → Settings → Environment Variables
6. Run migrations against production DB:
   ```bash
   DATABASE_URL="..." DIRECT_URL="..." pnpm db:migrate
   pnpm db:seed   # sports reference data only
   ```
7. Bootstrap a production admin (one-time):
   ```bash
   ADMIN_BOOTSTRAP_SECRET="your-32-char-secret" \
   DATABASE_URL="..." \
   pnpm bootstrap:admin admin@yourcompany.com 'StrongPasswordHere!'
   ```
8. Push to `main` → Vercel auto-deploys

### Pre-deploy validation

```bash
pnpm validate:env
pnpm typecheck
pnpm test
pnpm build --filter=@gamepool/web
```

### Full step-by-step guide

See **[docs/deployment-runbook.md](docs/deployment-runbook.md)** for env var tables, smoke tests, E2E on staging, and troubleshooting.

Also see:
- [docs/production-monitoring.md](docs/production-monitoring.md) — Sentry, health checks, alerts
- [docs/rollback-runbook.md](docs/rollback-runbook.md) — safe rollback procedure

---

## How users access the app

GamePool is a **web application**, not a native app in the Play Store or App Store yet.

| Who | How they use it |
|-----|-----------------|
| **You (developer)** | Deploy to Vercel → get a URL like `https://gamepool.vercel.app` or your custom domain |
| **End users** | Open that URL in **Chrome, Safari, Firefox, or Edge** on phone or desktop |
| **No download required** | Users bookmark the URL or add it to their home screen (see below) |

There is nothing to "download" from GitHub for end users — they use the **hosted website** you deploy.

---

## Mobile: Android & iOS

### What works today

- The UI is **responsive** — works in mobile browsers after you deploy
- **Firebase Phone OTP** works on production domains (add domain in Firebase Console)
- Users can **bookmark** the site on any device

### Install on home screen (today, limited)

Without a full PWA build, users can still pin the site:

| Platform | Steps |
|----------|-------|
| **Android (Chrome)** | Menu (⋮) → **Add to Home screen** or **Install app** (if browser offers it) |
| **iOS (Safari)** | Share → **Add to Home Screen** |

This opens like an app icon but runs the website in a browser shell. Offline support and push notifications are **not** included yet.

### Full installable app (recommended upgrade)

To make a proper **installable PWA** (better icon, splash screen, optional offline):

1. Add `public/manifest.json` (name, icons, theme color, `display: standalone`)
2. Add a service worker (e.g. `next-pwa` or Workbox)
3. Add Apple meta tags in `app/layout.tsx` (`apple-mobile-web-app-capable`, icons)
4. Test **Lighthouse PWA** audit before launch

### Native Play Store / App Store (future)

| Approach | Effort | Best for |
|----------|--------|----------|
| **PWA only** | Low | Fast launch, one codebase |
| **[Capacitor](https://capacitorjs.com/)** wrap | Medium | Same Next.js/web UI in a native shell → Play Store & App Store |
| **React Native / Expo** | High | Best native UX, separate mobile codebase |

**Practical path:** Deploy web → add PWA → wrap with Capacitor if you need store listings.

---

## Recommended next steps

### To launch publicly

- [ ] Deploy to Vercel with production env vars
- [ ] Custom domain + HTTPS (automatic on Vercel)
- [ ] Firebase: production domain in Authorized domains
- [ ] Strong `ADMIN_JWT_SECRET` (32+ chars), never use seed admin password
- [ ] Set up Sentry for error alerts
- [ ] Set up Upstash Redis for distributed rate limiting
- [ ] Run E2E tests against staging: `pnpm test:e2e`

### To improve mobile experience

- [ ] Add PWA manifest + icons (192×192, 512×512)
- [ ] Enable Firebase Cloud Messaging for push notifications
- [ ] Test sign-up/sign-in on real Android and iPhone browsers

### To grow the product

- [ ] App Store / Play Store via Capacitor (after PWA is solid)
- [ ] Firebase App Check (reduce abuse)
- [ ] Analytics (Vercel Analytics, Plausible, or GA4)

---

## Monorepo

| Package | Description |
|---------|-------------|
| `apps/web` | Next.js 15 app (UI + API routes) |
| `packages/database` | Prisma client singleton |
| `packages/shared` | Shared types, Zod schemas, API envelope |
| `packages/config` | Shared TSConfig |
| `e2e` | Playwright end-to-end tests |
| `prisma` | Schema, migrations, seed |
| `scripts` | Env validation, admin bootstrap |

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | Playwright E2E tests |
| `pnpm validate:env` | Validate production env vars |
| `pnpm bootstrap:admin` | Create production admin user |
| `pnpm db:migrate` | Apply migrations (deploy) |
| `pnpm db:migrate:dev` | Create/apply migrations (dev) |
| `pnpm db:seed` | Seed sports + optional dev admin |
| `pnpm db:studio` | Prisma Studio GUI |

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [PRD](docs/PRD.md) | Product requirements |
| [Database Design](docs/database-design.md) | Schema reference |
| [Implementation Plan](docs/implementation-plan.md) | Build phases |
| [Deployment Runbook](docs/deployment-runbook.md) | Production deploy steps |
| [Production Monitoring](docs/production-monitoring.md) | Sentry, health, alerts |
| [Rollback Runbook](docs/rollback-runbook.md) | Incident rollback |

---

## License

Private project — all rights reserved unless otherwise specified.
