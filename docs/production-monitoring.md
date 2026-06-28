# Production Monitoring

Operational guide for monitoring GamePool in production (Vercel + PostgreSQL + Firebase + Sentry + Upstash).

## Health endpoints

| Endpoint | Purpose | Expected |
|----------|---------|----------|
| `GET /api/v1/health` | Liveness | `200` — app process responding |
| `GET /api/v1/health/ready` | Readiness | `200` — database reachable |

Configure an external uptime monitor (Better Uptime, Pingdom, UptimeRobot, or Vercel Monitoring) to poll both endpoints every 1–5 minutes from multiple regions.

**Alert on:** any `5xx`, `503`, or readiness failure lasting > 2 consecutive checks.

## Sentry (error monitoring)

### Configuration

| Variable | Scope | Required (prod) |
|----------|-------|-----------------|
| `SENTRY_DSN` | Server / edge | Recommended |
| `NEXT_PUBLIC_SENTRY_DSN` | Client | Recommended |
| `SENTRY_ORG` | Build (source maps) | Optional |
| `SENTRY_PROJECT` | Build | Optional |
| `SENTRY_AUTH_TOKEN` | CI / Vercel build | Optional |

Sentry is **disabled** when no DSN is set (local dev works without it).

### What to monitor

- **Issues:** unhandled exceptions, API `5xx`, React error boundaries
- **Performance:** transaction traces (10% sample rate in production)
- **Alerts:** spike in error rate, new issue types, P95 latency regression

### Recommended Sentry alerts

1. Error rate > 1% of sessions (5 min window)
2. New issue in `production` environment
3. `RATE_LIMITED` or `DATABASE` errors exceeding baseline

## Vercel

- Enable **Vercel Analytics** (optional) for Web Vitals
- Review **Function logs** for API route failures
- Watch **cold start latency** on `/api/v1/*` routes
- Set deployment notifications to Slack/email

## Database (PostgreSQL)

- Monitor connection count vs pool limit (Neon / Supabase dashboard)
- Alert on storage > 80%, CPU sustained > 70%
- Track slow queries (> 500ms) via provider insights

## Firebase

- Authentication → Usage: SMS OTP volume and anomalies
- Set quota alerts for Phone Auth
- Monitor failed sign-in spikes in Firebase console

## Upstash Redis (rate limiting)

| Variable | Purpose |
|----------|---------|
| `UPSTASH_REDIS_REST_URL` | REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Auth token |

When configured, middleware uses distributed sliding-window limits:

- **API:** 120 req / 60s per IP
- **Auth routes:** 20 req / 60s per IP

Monitor Upstash dashboard for command volume and latency. If Redis is unavailable, the app **falls back to in-memory** limits per serverless instance (weaker protection).

## Key metrics (launch week)

| Metric | Target | Source |
|--------|--------|--------|
| API P95 latency | < 800ms | Sentry / Vercel |
| Error rate | < 0.5% | Sentry |
| Health ready uptime | > 99.5% | Uptime monitor |
| Join request success | > 95% | App logs / manual QA |
| OTP delivery success | > 98% | Firebase console |

## Log queries (Vercel)

Filter function logs for structured errors:

```
level:error
```

API errors return JSON `{ error: { code, message } }` — correlate with Sentry via `digest` on global error page.

## Runbooks

- Deployment: [deployment-runbook.md](./deployment-runbook.md)
- Rollback: [rollback-runbook.md](./rollback-runbook.md)
