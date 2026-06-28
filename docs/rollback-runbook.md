# Rollback Runbook

How to safely roll back a bad GamePool production deployment.

## Decision criteria

Roll back immediately if:

- Health `/api/v1/health/ready` failing in production
- Error rate spike > 5% (Sentry)
- Auth completely broken (Firebase / bootstrap)
- Data corruption risk from a bad migration

Investigate before rollback if:

- Single non-critical UI bug
- Elevated rate-limit 429s (may be traffic, not deploy)

## 1. Vercel instant rollback (fastest)

**Time:** ~1 minute  
**Scope:** Application code + env at previous deployment  
**Database:** Unchanged

1. Open Vercel project → **Deployments**
2. Find last known-good production deployment
3. Click **⋯** → **Promote to Production** (or **Rollback**)
4. Verify:
   ```bash
   curl -s https://your-domain.com/api/v1/health/ready
   ```

This does **not** revert database schema changes.

## 2. Git revert (code fix forward)

**Time:** 5–15 minutes (includes CI)  
**Scope:** New deployment from reverted commit

```bash
git revert <bad-commit-sha>
git push origin main
```

Wait for CI (`typecheck`, `test`, `build`) to pass, then confirm Vercel deploy.

## 3. Database migration rollback

**⚠️ High risk.** Only if a migration caused the incident and you have a tested down migration.

Prisma does not auto-generate down migrations. Options:

1. **Forward fix:** deploy a corrective migration (preferred)
2. **Manual SQL:** restore from backup + replay to point before migration
3. **Neon branch restore:** restore DB branch to timestamp before migration

### Before any DB rollback

- [ ] Snapshot / backup current state
- [ ] Document migration name and SQL applied
- [ ] Notify team — brief read-only window may be needed

### After DB rollback

- [ ] Run `pnpm db:migrate` against rolled-back schema if app version expects older schema
- [ ] Verify `/api/v1/health/ready`
- [ ] Run smoke tests

## 4. Environment variable rollback

If a bad secret was deployed:

1. Vercel → Settings → Environment Variables
2. Restore previous value (or rotate secret)
3. **Redeploy** (env changes require redeploy)

Common incidents:

- Wrong `FIREBASE_PRIVATE_KEY` formatting
- Short `ADMIN_JWT_SECRET` (invalidates admin sessions)
- Wrong `DATABASE_URL` (points to wrong DB)

## 5. Firebase rollback

Firebase config is **not** tied to Vercel deploys.

If Phone Auth or domain config broke:

1. Firebase Console → Authentication → Settings
2. Restore authorized domains
3. Re-enable sign-in providers if disabled

No Vercel rollback needed for Firebase-only fixes.

## 6. Upstash / Sentry

These are independent of app deploys:

- **Upstash:** deleting keys is rarely needed; rate limit data expires automatically
- **Sentry:** no rollback; filter issues by release tag `VERCEL_GIT_COMMIT_SHA`

## 7. Post-rollback checklist

- [ ] `/api/v1/health` and `/ready` return 200
- [ ] Sentry error rate returning to baseline (15 min)
- [ ] Sign-in smoke test (email + phone)
- [ ] Admin login works
- [ ] Incident documented (timeline, root cause, follow-up)

## 8. Communication template

```
GamePool production incident — RESOLVED via rollback

Impact: [brief]
Duration: [start] – [end] UTC
Action: Rolled back Vercel deployment to [deployment id / commit]
Data: No data loss / [describe if migration involved]
Next: Root cause analysis, fix in [ticket]
```

## Prevention

- Always run `pnpm validate:env` before deploy
- Run migrations separately and verify before traffic shift
- Use preview deployments for risky changes
- Keep E2E secrets in CI for regression on `main`

## Related

- [deployment-runbook.md](./deployment-runbook.md)
- [production-monitoring.md](./production-monitoring.md)
