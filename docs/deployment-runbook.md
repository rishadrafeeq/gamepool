# Deployment Runbook

Step-by-step production deployment for GamePool on Vercel.

## Prerequisites

- [ ] Vercel project linked to `apps/web` (root directory)
- [ ] Production PostgreSQL (Neon recommended) with pooled + direct URLs
- [ ] Firebase project with Email + Phone auth enabled
- [ ] Upstash Redis database created
- [ ] Sentry project created
- [ ] All secrets stored in Vercel (never committed)

## 1. Pre-deploy validation

```bash
# From repo root — load production env first
export NODE_ENV=production
# source your production env or use Vercel env pull

pnpm validate:env
pnpm typecheck
pnpm test
pnpm build --filter=@gamepool/web
```

All must pass before merging to `main`.

## 2. Environment variables (Vercel Production)

### Required

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Pooled connection string |
| `DIRECT_URL` | Direct URL for migrations |
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` |
| `NEXT_PUBLIC_FIREBASE_*` | All 6 client Firebase vars |
| `FIREBASE_PROJECT_ID` | Service account |
| `FIREBASE_CLIENT_EMAIL` | Service account |
| `FIREBASE_PRIVATE_KEY` | Escape newlines as `\n` |
| `ADMIN_JWT_SECRET` | Min 32 random characters |

### Strongly recommended

| Variable | Notes |
|----------|-------|
| `SENTRY_DSN` | Server error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | Client error tracking |
| `UPSTASH_REDIS_REST_URL` | Distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Paired with URL |

### Must NOT be set (or set safely)

| Variable | Production value |
|----------|------------------|
| `ADMIN_ALLOW_SEED` | `false` |
| `SEED_ADMIN_PASSWORD` | Do not use `changeme` |
| `ADMIN_BOOTSTRAP_SECRET` | Only for one-time bootstrap CLI |

## 3. Database migration

Run migrations **before** or **immediately after** deploy (not in Vercel build by default):

```bash
DATABASE_URL="..." DIRECT_URL="..." pnpm db:migrate
```

Sports seed (no admin) is safe:

```bash
pnpm db:seed
```

## 4. Bootstrap admin (one-time)

```bash
ADMIN_BOOTSTRAP_SECRET="your-32-char-secret" \
DATABASE_URL="..." \
pnpm bootstrap:admin admin@yourcompany.com 'StrongPasswordHere!'
```

Never rely on `db:seed` for production admin accounts.

## 5. Firebase console

- [ ] Add production domain to **Authorized domains**
- [ ] Enable **Phone** sign-in method
- [ ] Configure test phone numbers only in staging
- [ ] (Recommended) Enable App Check

## 6. Deploy

### Automatic (recommended)

Push to `main` → Vercel production deploy triggered by Git integration.

### Manual

```bash
vercel --prod
```

## 7. Post-deploy smoke test

```bash
curl -s https://your-domain.com/api/v1/health | jq .
curl -s https://your-domain.com/api/v1/health/ready | jq .
```

Manual checks:

- [ ] Sign-in page loads (no CSP console errors)
- [ ] Email sign-in works
- [ ] Phone OTP works on production domain
- [ ] Create + join match flow
- [ ] Admin login at `/admin/login`
- [ ] Sentry receives a test error (optional staged throw)

## 8. E2E against staging

```bash
E2E_BASE_URL=https://staging.your-domain.com \
E2E_HOST_EMAIL=... E2E_HOST_PASSWORD=... \
pnpm test:e2e
```

## 9. CI verification

Every PR to `main` / `develop` runs:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build --filter=@gamepool/web`

`main` branch also runs Playwright E2E when GitHub secrets are configured.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Build fails on Vercel | Run `pnpm build` locally with same env |
| 500 on all API routes | `DATABASE_URL`, Prisma migrate |
| Firebase auth fails | Authorized domains, API keys match project |
| OTP blocked | Firebase SMS quota, reCAPTCHA / CSP |
| Rate limit too aggressive | Upstash analytics, adjust limits in code |
| Sentry empty | DSN env vars on Vercel, redeploy after adding |

## Related

- [production-monitoring.md](./production-monitoring.md)
- [rollback-runbook.md](./rollback-runbook.md)
