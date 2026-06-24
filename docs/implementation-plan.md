# GamePool — MVP Implementation Plan

**Version:** 1.0  
**Status:** Ready for Development  
**Last Updated:** June 23, 2026  
**Sources of truth:** [`PRD.md`](./PRD.md) v2.1 · [`database-design.md`](./database-design.md) v2.1 · `prisma/schema.prisma`

---

## Executive Summary

GamePool MVP is a **single Next.js 15 application** deployed on Vercel with **App Router API routes** (`/api/v1/*`), **Prisma + PostgreSQL**, and **Firebase** (Auth, Storage, FCM). The codebase uses **feature-based Clean Architecture** with repository and service layers, RBAC for admin, and audit logging for moderation.

**Core workflow to ship:** Find Players → Find Teammates → Find Opponents → Create Match → Join Match → Play.

**Estimated timeline:** 10–14 weeks (2 full-stack engineers + 1 part-time designer).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Vercel (apps/web)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ App Router   │  │ API Routes   │  │ Admin Routes         │  │
│  │ (consumer UI)│  │ /api/v1/*    │  │ /admin/*             │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         └─────────────────┼──────────────────────┘              │
│                           ▼                                     │
│              Feature Services → Repositories → Prisma           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   PostgreSQL          Firebase Auth        Firebase Storage
   (Vercel/Neon)       + FCM                (avatars)
```

### Layer Responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Route handlers** | `app/api/v1/**/route.ts` | HTTP parsing, auth guard, call service, map response |
| **Services** | `src/features/*/services/` | Business rules, transactions, notifications emit |
| **Repositories** | `src/features/*/repositories/` | Prisma queries only; no business logic |
| **Schemas** | `src/features/*/schemas/` | Zod validation (request/response) |
| **Policies** | `src/server/policies/` | Visibility, blocks, connections, RBAC |
| **Shared** | `packages/shared/` | Types, enums, API envelope, constants |

### API Response Envelope

```typescript
{ data: T, meta?: { page, limit, total }, links?: { self, next } }
```

Errors: `{ error: { code, message, details? } }` with appropriate HTTP status.

---

# Phase 1 — Foundation

**Goal:** Runnable monorepo, database migrated, Firebase wired, CI green.  
**Duration:** Week 1–2

## 1.1 Project Structure

```
gamepool/
├── apps/
│   └── web/                          # Next.js 15 — consumer + API + admin
│       ├── app/
│       │   ├── (auth)/                 # S01–S08
│       │   ├── (app)/                  # S09–S35 consumer
│       │   ├── admin/                  # S36–S40
│       │   └── api/
│       │       └── v1/                 # REST API
│       ├── src/
│       │   ├── features/               # Feature modules (see §1.3)
│       │   ├── components/             # Shared UI (shadcn)
│       │   ├── lib/                    # firebase, prisma client, utils
│       │   └── server/                 # middleware, policies, errors
│       ├── public/
│       └── package.json
├── packages/
│   ├── database/                       # Re-export Prisma client
│   ├── shared/                         # Zod schemas, types, constants
│   └── config/                         # ESLint, TSConfig presets
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── package.json                        # pnpm workspaces root
├── pnpm-workspace.yaml
├── turbo.json
└── .env.example
```

## 1.2 Monorepo Structure

| Package | Purpose |
|---------|---------|
| `apps/web` | Next.js 15 app (UI + API routes) |
| `packages/database` | `@gamepool/database` — singleton Prisma client |
| `packages/shared` | `@gamepool/shared` — Zod, enums, DTO types |
| `packages/config` | Shared `tsconfig`, ESLint |

**Tooling:** pnpm workspaces · Turborepo (`build`, `lint`, `typecheck`, `test`) · Node 20 LTS

## 1.3 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, TailwindCSS, shadcn/ui |
| Backend | Next.js Route Handlers, Prisma 5.x |
| Database | PostgreSQL 15+ (Neon / Vercel Postgres / Supabase) |
| Auth | Firebase Auth (phone OTP + email) |
| Storage | Firebase Storage (avatars) |
| Push | Firebase Cloud Messaging (web push) |
| Validation | Zod |
| Client state | Zustand (auth mirror, UI) |
| Server state | TanStack Query v5 |
| Deploy | Vercel + managed PostgreSQL |

## 1.4 Database Setup

**Tasks:**

1. Apply migrations in order: `00001_init` → `00002_mvp_coordination` (if needed) → `00003_schema_supplement`
2. Run `pnpm db:generate` and `pnpm db:migrate` (dev)
3. Seed script: `prisma/seed.ts`
   - Sports: football, cricket, badminton with `icon_url`, `color`
   - Optional: dev admin user (hashed password)
4. Configure connection pooling (Neon pooler or PgBouncer) for serverless
5. Prisma client singleton in `packages/database/src/client.ts` (avoid hot-reload exhaustion)

**Scripts (root `package.json`):**

```json
"db:generate": "prisma generate",
"db:migrate": "prisma migrate deploy",
"db:migrate:dev": "prisma migrate dev",
"db:seed": "tsx prisma/seed.ts",
"db:studio": "prisma studio"
```

## 1.5 Authentication Setup

**Consumer (Firebase):**

1. Firebase project: dev / staging / prod
2. Enable Phone + Email providers
3. `src/lib/firebase/client.ts` — browser SDK init
4. `src/lib/firebase/admin.ts` — Admin SDK for API token verification
5. Bootstrap flow: `POST /api/v1/auth/bootstrap`
   - Verify Firebase ID token
   - Upsert `users` by `firebase_uid`
   - Create `user_profiles` if missing
6. API middleware: `verifyFirebaseToken()` → attach `request.userId`

**Admin (separate):**

1. Session cookie or JWT signed with `ADMIN_JWT_SECRET`
2. `POST /api/v1/admin/auth/login` — email/password against `admin_users`
3. RBAC middleware: `requireAdminRole(['MODERATOR', 'SUPER_ADMIN'])`

**Environment variables:**

```
DATABASE_URL=
DIRECT_URL=                    # migrations
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
NEXT_PUBLIC_FIREBASE_*         # client config
ADMIN_JWT_SECRET=
```

## 1.6 Foundation Deliverables Checklist

- [ ] Monorepo boots with `pnpm install && pnpm dev`
- [ ] PostgreSQL migrated; seed sports loaded
- [ ] Firebase Auth sign-in works in browser
- [ ] `POST /api/v1/auth/bootstrap` returns user + profile
- [ ] ESLint + Prettier + TypeScript strict mode
- [ ] GitHub Actions: lint, typecheck, test on PR

---

# Phase 2 — Backend

**Goal:** Complete REST API for all MVP PRD epics.  
**Duration:** Week 3–7

## 2.1 Prisma Models (implemented)

All models in `prisma/schema.prisma` including supplement v2.1:

| Domain | Models |
|--------|--------|
| Auth / Users | `User`, `UserProfile`, `UserSport`, `UserAvailability` |
| Sports | `Sport` |
| Connections | `SportsConnection` |
| Teammates | `TeammateRequest`, `TeammateRequestInterest` |
| Opponents | `OpponentRequest`, `OpponentRequestInterest` |
| Matches | `Match`, `MatchParticipant`, `MatchJoinRequest`, `MatchInvite` |
| Safety | `UserBlock`, `Report` |
| Admin | `AdminUser`, `AdminAuditEvent` |
| Notifications | `Notification` |

## 2.2 Feature Module Layout

Each feature under `src/features/<name>/`:

```
features/matches/
├── repositories/match.repository.ts
├── services/match.service.ts
├── services/match-lifecycle.service.ts
├── services/match-visibility.service.ts
├── schemas/match.schema.ts
└── types.ts
```

## 2.3 API Routes

Base path: `/api/v1`. All consumer routes require Firebase auth unless noted.

### Auth & Users

| Method | Route | Service | PRD |
|--------|-------|---------|-----|
| POST | `/auth/bootstrap` | AuthService.bootstrap | US-A1 |
| GET | `/users/me` | UserService.getMe | US-A5 |
| PATCH | `/users/me` | UserService.updateMe | US-A5 |
| DELETE | `/users/me` | UserService.requestDeletion | FR-3 |
| GET | `/users/:id` | UserService.getPublicProfile | US-B3, FR-8 |
| GET | `/users/me/sports` | UserSportService.list | US-A2 |
| PUT | `/users/me/sports` | UserSportService.replaceAll | US-A2 |
| GET | `/users/me/availability` | AvailabilityService.list | US-A4 |
| PUT | `/users/me/availability` | AvailabilityService.replaceAll | US-A4 |

### Sports

| Method | Route | Notes |
|--------|-------|-------|
| GET | `/sports` | Public; returns slug, name, iconUrl, color, formats |

### Find Players

| Method | Route | PRD |
|--------|-------|-----|
| GET | `/players` | US-B1 — filters: sportId, skillLevel, city, radius |
| GET | `/players/:id` | US-B3 |

**Policies:** Exclude blocked users; respect `profile_visibility` (connections-only).

### Sports Connections

| Method | Route | PRD |
|--------|-------|-----|
| GET | `/connections` | List accepted + pending |
| POST | `/connections` | US-B4 — body: `recipientUserId` |
| PATCH | `/connections/:id` | Accept / decline |
| DELETE | `/connections/:id` | Remove connection |

### Teammate Requests

| Method | Route | PRD |
|--------|-------|-----|
| GET | `/teammate-requests` | US-C2 |
| POST | `/teammate-requests` | US-C1 |
| GET | `/teammate-requests/:id` | S27 |
| POST | `/teammate-requests/:id/interests` | US-C3 |
| PATCH | `/teammate-requests/:id/interests/:interestId` | US-C4 approve/decline |
| PATCH | `/teammate-requests/:id` | Close |

### Opponent Requests

| Method | Route | PRD |
|--------|-------|-----|
| GET | `/opponent-requests` | US-D2 |
| POST | `/opponent-requests` | US-D1 |
| GET | `/opponent-requests/:id` | S28 |
| POST | `/opponent-requests/:id/interests` | US-D2 |
| PATCH | `/opponent-requests/:id/interests/:interestId` | US-D4 confirm |
| POST | `/opponent-requests/:id/pair` | Link sides → shared match |

### Matches

| Method | Route | PRD |
|--------|-------|-----|
| GET | `/matches` | US-E2 — visibility-aware discovery |
| POST | `/matches` | US-E1 |
| GET | `/matches/:id` | US-E10 — visibility + participant check |
| PATCH | `/matches/:id` | Host update (draft/open only) |
| POST | `/matches/:id/publish` | Draft → Open |
| POST | `/matches/:id/cancel` | FR-24 |
| POST | `/matches/:id/start` | US-E11 → In Progress |
| POST | `/matches/:id/complete` | US-E11 → Completed |
| GET | `/matches/:id/participants` | Roster |
| DELETE | `/matches/:id/participants/:userId` | FR-22 host remove |
| POST | `/matches/:id/leave` | US-E5 |

### Match Join Requests

| Method | Route | PRD |
|--------|-------|-----|
| POST | `/matches/:id/join-requests` | US-E3 — creates `match_join_requests` |
| GET | `/matches/:id/join-requests` | Host inbox |
| PATCH | `/matches/:id/join-requests/:requestId` | Approve → create participant; Decline |
| DELETE | `/matches/:id/join-requests/:requestId` | User cancel (CANCELLED) |

**Join flow (transaction):**

1. Policy: visibility, blocks, skill, match status, capacity
2. If host requires approval → `match_join_requests` PENDING
3. If auto-join → approve inline → `match_participants` CONFIRMED
4. If full + waitlist → `match_participants` WAITLIST
5. Update `confirmed_count`; set FULL when at capacity

### Match Invites

| Method | Route | PRD |
|--------|-------|-----|
| POST | `/matches/:id/invites` | US-E7 |
| GET | `/invites` | My pending invites |
| PATCH | `/invites/:id` | US-E8 accept/decline |

### Waitlist

| Method | Route | PRD |
|--------|-------|-----|
| POST | `/matches/:id/waitlist` | US-E9 |
| POST | `/matches/:id/waitlist/promote` | Internal/cron on slot open |

### Safety

| Method | Route | PRD |
|--------|-------|-----|
| POST | `/blocks` | US-G3 |
| DELETE | `/blocks/:blockedUserId` | Unblock |
| POST | `/reports` | US-G2 |

### Notifications

| Method | Route | PRD |
|--------|-------|-----|
| GET | `/notifications` | US-G1 |
| PATCH | `/notifications/:id/read` | Mark read |
| POST | `/notifications/read-all` | Bulk read |
| POST | `/users/me/fcm-token` | Register FCM device token |

## 2.4 Core Services

| Service | Responsibilities |
|---------|------------------|
| `AuthService` | Firebase verify, bootstrap, session metadata |
| `UserService` | Profile CRUD, public profile with visibility |
| `PlayerDiscoveryService` | Search with blocks, skill, availability filters |
| `ConnectionService` | Send/accept/decline; duplicate prevention |
| `TeammateRequestService` | CRUD + interest approval |
| `OpponentRequestService` | CRUD + pairing → match |
| `MatchService` | CRUD, publish, visibility rules |
| `MatchLifecycleService` | State transitions (Open/Full/In Progress/Completed) |
| `MatchJoinService` | Join requests, auto-join, waitlist, atomic capacity |
| `MatchInviteService` | Direct invites |
| `ParticipantService` | Roster, leave, remove |
| `BlockService` | Block checks (central) |
| `ReportService` | Create report |
| `NotificationService` | Persist + enqueue FCM |
| `AdminDashboardService` | FR-37 metrics |
| `AdminUserService` | Suspend/reinstate + audit |
| `AdminMatchService` | Hide, cancel, status override |
| `AdminReportService` | Queue, resolve, dismiss + audit |

## 2.5 Validation (Zod)

Define in `packages/shared` or per-feature `schemas/`:

- `CreateMatchSchema`, `UpdateMatchSchema`, `PublishMatchSchema`
- `CreateJoinRequestSchema`, `ReviewJoinRequestSchema`
- `PlayerSearchQuerySchema` (sportId, skillLevel, city, page, limit)
- `ConnectionCreateSchema`, `ReportCreateSchema`
- `AvailabilityWindowSchema` (dayOfWeek, startTime, endTime)
- `AdminLoginSchema`

Validate in route handler before service call; return `400` with field errors.

## 2.6 Authorization

### Consumer policies (`src/server/policies/`)

| Policy | Rules |
|--------|-------|
| `visibility.policy` | PUBLIC / CONNECTIONS_ONLY / INVITE_ONLY discovery |
| `block.policy` | Blocked users cannot connect, invite, join, discover |
| `match.policy` | Host-only: approve joins, invites, cancel, lifecycle |
| `participant.policy` | Confirmed users see full match detail |
| `profile.policy` | Connections-only profile gating |

### Admin RBAC

| Role | Permissions |
|------|-------------|
| `SUPPORT` | View dashboard, users, matches, reports (read-only) |
| `MODERATOR` | + suspend users, resolve reports, hide matches |
| `SUPER_ADMIN` | + manage admin users, reinstate, override match status |

All admin mutations write to `admin_audit_events`.

## 2.7 Cross-Cutting Backend Concerns

- **Transactions:** All join/approve/leave flows use `prisma.$transaction` + `FOR UPDATE` on match row
- **Rate limiting:** Upstash Redis or Vercel KV — connections, invites, reports per user/hour
- **Error taxonomy:** `BLOCKED`, `NOT_VISIBLE`, `MATCH_FULL`, `INVALID_STATE`, `UNAUTHORIZED`
- **Soft delete:** Repository base filters `deletedAt: null`

## 2.8 Backend Deliverables Checklist

- [ ] All `/api/v1` routes implemented with Zod validation
- [ ] Join flow passes concurrency test (last slot)
- [ ] Visibility + block policies enforced server-side
- [ ] Admin routes with RBAC + audit log
- [ ] OpenAPI or typed client generated from shared schemas (optional)

---

# Phase 3 — Frontend

**Goal:** All 36 PRD consumer screens, mobile-first.  
**Duration:** Week 5–10 (overlaps Phase 2)

## 3.1 Routing Structure (App Router)

```
app/
├── (auth)/
│   ├── welcome/page.tsx              # S01
│   ├── sign-up/page.tsx              # S02
│   ├── verify/page.tsx               # S03
│   ├── sign-in/page.tsx              # S04
│   └── onboarding/
│       ├── sports/page.tsx           # S05
│       ├── skills/page.tsx           # S06
│       ├── location/page.tsx         # S07
│       └── availability/page.tsx     # S08
├── (app)/
│   ├── layout.tsx                    # Bottom nav + AuthGuard
│   ├── page.tsx                      # S09 Home / Discover
│   ├── players/
│   │   ├── page.tsx                  # S10
│   │   └── [id]/page.tsx             # S18
│   ├── teammates/
│   │   ├── page.tsx                  # S11
│   │   └── [id]/page.tsx             # S27
│   ├── opponents/
│   │   ├── page.tsx                  # S12
│   │   └── [id]/page.tsx             # S28
│   ├── matches/
│   │   ├── create/
│   │   │   ├── page.tsx              # S21 Step 1
│   │   │   ├── schedule/page.tsx     # S22 Step 2
│   │   │   └── details/page.tsx      # S23 Step 3
│   │   ├── [id]/
│   │   │   ├── page.tsx              # S24 Detail
│   │   │   └── manage/page.tsx       # S25 Host manage
│   │   ├── [id]/join/page.tsx        # S26 Confirmation
│   │   └── [id]/waitlist/page.tsx    # S35
│   ├── my-games/page.tsx             # S14
│   ├── profile/page.tsx              # S15
│   ├── notifications/page.tsx        # S16
│   ├── settings/page.tsx             # S17
│   ├── connections/page.tsx          # S30
│   ├── connections/[id]/page.tsx     # S19
│   ├── invites/[id]/page.tsx         # S29
│   └── users/[id]/
│       ├── report/page.tsx           # S20
│       └── block/page.tsx            # S20
└── error.tsx / not-found.tsx         # S33, S34
```

## 3.2 Screen → API Mapping (key flows)

| Screen | Primary APIs |
|--------|--------------|
| S09 Discover | `GET /matches` |
| S10 Find Players | `GET /players` |
| S21–S23 Create Match | `POST /matches`, `POST /matches/:id/publish` |
| S24 Match Detail | `GET /matches/:id` |
| S25 Manage | join-requests, invites, participants, lifecycle |
| S26 Join | `POST /matches/:id/join-requests` |
| S30 Connections | `GET /connections`, `PATCH /connections/:id` |

## 3.3 Component Library

**shadcn/ui primitives:** Button, Input, Select, Dialog, Sheet, Tabs, Badge, Avatar, Card, Skeleton, Toast, DropdownMenu

**Domain components (`src/components/domain/`):**

| Component | Used on |
|-----------|---------|
| `MatchCard` | S09, S14 |
| `PlayerCard` | S10 |
| `SportBadge` | All — uses `sport.color`, `sport.iconUrl` |
| `SkillLevelSelect` | S06, filters — B/I/A/P |
| `VisibilityPicker` | S23 |
| `LifecycleBadge` | S14, S24, S25 |
| `RosterList` | S24, S25 |
| `ConnectionRequestCard` | S30 |
| `NotificationItem` | S16 |
| `EmptyState` | S33 |
| `OfflineBanner` | S34 |

**Layout:**

- `MobileShell` — max-width container, safe areas
- `BottomNav` — Home, Players, My Games, Notifications, Profile
- `PageHeader` — back + title + action

## 3.4 State Management

| Concern | Tool |
|---------|------|
| Firebase auth session | `useAuthStore` (Zustand) |
| Server data | TanStack Query — one hook per resource (`useMatches`, `usePlayer`, etc.) |
| Create match wizard | `useCreateMatchStore` (Zustand) — multi-step form |
| Optimistic updates | Join request, connection accept |

**Query keys:** `['matches', filters]`, `['match', id]`, `['players', filters]`, `['notifications']`

## 3.5 Mobile-First UX Rules

- Touch targets ≥ 44px; bottom nav for primary navigation
- Core flows ≤ 3 taps from home (PRD NFR-19)
- Skeleton loaders on discovery feeds
- Pull-to-refresh on lists (optional P1)
- WCAG 2.1 AA on primary flows

## 3.6 Frontend Deliverables Checklist

- [ ] S01–S35 implemented and wired to API
- [ ] Onboarding gate before join/host
- [ ] Visibility-aware match discovery
- [ ] Host manage screen: requests, invites, lifecycle
- [ ] Empty and offline states
- [ ] Avatar upload to Firebase Storage

---

# Phase 4 — Admin Panel

**Goal:** FR-36–FR-40 admin platform at `/admin/*`.  
**Duration:** Week 9–11

## 4.1 Admin Routes

```
app/admin/
├── login/page.tsx                    # S36
├── layout.tsx                        # AdminAuthGuard + sidebar
├── page.tsx                          # S37 Dashboard
├── users/page.tsx                    # S38
├── users/[id]/page.tsx
├── matches/page.tsx                  # S39
├── matches/[id]/page.tsx
└── reports/page.tsx                  # S40
```

## 4.2 Dashboard (S37) — FR-37 Metrics

| Widget | API | Source |
|--------|-----|--------|
| New Users Today | `GET /admin/metrics/summary` | `users.created_at` |
| Active Matches | same | `matches.status IN (OPEN, FULL, IN_PROGRESS)` |
| Pending Reports | same | `reports.status IN (OPEN, UNDER_REVIEW)` |
| WAP | same | Distinct participants + hosts last 7 days |
| Match Fill Rate | `GET /admin/metrics/fill-rate` | 7-day rolling |
| Sports Distribution | `GET /admin/metrics/sports` | GROUP BY sport |
| Top Active Locations | `GET /admin/metrics/locations` | city/area aggregates |

Refresh on load; optional 60s polling.

## 4.3 User Management (S38)

- Search by name, email, phone, id
- View profile, sports, match history counts
- Actions: Suspend, Reinstate → `AdminUserService` + audit event

## 4.4 Match Management (S39)

- Search/filter by sport, status, host, date
- Actions: Cancel, hide from discovery, force status transition
- View participants and reports linked to match

## 4.5 Reports & Moderation (S40)

- Queue: OPEN → UNDER_REVIEW → RESOLVED / DISMISSED
- Assign reviewer; resolution notes
- Notify reporter via `REPORT_STATUS_UPDATED`

## 4.6 Admin Deliverables Checklist

- [ ] Separate admin login (not Firebase consumer)
- [ ] Dashboard 7 metrics
- [ ] User suspend/reinstate with audit trail
- [ ] Match moderation actions
- [ ] Reports queue end-to-end

---

# Phase 5 — Notifications

**Goal:** In-app inbox + FCM push for all coordination events.  
**Duration:** Week 10–11

## 5.1 Notification Triggers

| Event | Type | Recipients |
|-------|------|------------|
| Join request created | `MATCH_JOIN_REQUEST` | Host |
| Join approved/declined | `MATCH_JOIN_APPROVED` / `DECLINED` | Requester |
| Connection request | `CONNECTION_REQUEST` | Recipient |
| Connection accepted | `CONNECTION_ACCEPTED` | Requester |
| Teammate interest | `TEAMMATE_REQUEST_INTEREST` | Creator |
| Opponent interest | `OPPONENT_REQUEST_INTEREST` | Creator |
| Waitlist promoted | `WAITLIST_PROMOTED` | User |
| Match invite | `MATCH_INVITE` | Invitee |
| Match cancelled | `MATCH_CANCELLED` | Participants |
| Match starting | `MATCH_STARTED` | Participants |
| Report updated | `REPORT_STATUS_UPDATED` | Reporter |
| Reminders | `MATCH_REMINDER` | Participants (24h, 2h cron) |

## 5.2 Implementation

1. `NotificationService.create()` — insert `notifications` row
2. `FcmService.send()` — Firebase Admin messaging to stored device tokens
3. Respect `push_notifications_enabled` on profile
4. Web: service worker `public/firebase-messaging-sw.js`
5. Deep links in `payload`: `{ route: '/matches/:id' }`

## 5.3 Scheduled Jobs

Use **Vercel Cron** (`vercel.json`):

| Cron | Job |
|------|-----|
| `0 * * * *` | Match reminders (24h, 2h windows) |
| `*/15 * * * *` | Expire stale requests (teammate/opponent/join) |
| `0 2 * * *` | Auto-complete matches N hours after `ends_at` (optional) |

## 5.4 Notifications Deliverables Checklist

- [ ] In-app inbox with unread badge
- [ ] FCM web push registered
- [ ] All MVP notification types emitted
- [ ] Cron reminders running in staging

---

# Phase 6 — Testing

**Goal:** Confidence for launch; guard join concurrency and policies.  
**Duration:** Week 11–13 (continuous from Phase 2)

## 6.1 Test Pyramid

| Layer | Tool | Focus |
|-------|------|-------|
| Unit | Vitest | Services, policies, Zod schemas |
| Integration | Vitest + test DB | Repositories, transactions |
| API | Vitest + supertest or `next/test` | Route handlers |
| E2E | Playwright | Critical user journeys |

## 6.2 Critical Test Cases

| ID | Scenario |
|----|----------|
| T1 | Sign up → onboarding → first match join |
| T2 | Two users join last slot — only one CONFIRMED |
| T3 | CONNECTIONS_ONLY match hidden from non-connection |
| T4 | INVITE_ONLY match requires invite |
| T5 | Blocked user cannot join or connect |
| T6 | Host approves join request → participant created |
| T7 | Waitlist promotion on leave |
| T8 | Match lifecycle Draft → Open → Full → In Progress → Completed |
| T9 | Admin suspend user → hidden from discovery |
| T10 | Report resolve → notification sent |

## 6.3 Test Infrastructure

- Docker Compose PostgreSQL for CI
- `prisma migrate deploy` + seed before integration tests
- Firebase Auth emulator for E2E (optional)
- Coverage target: 80% services/policies; 60% overall

## 6.4 Testing Deliverables Checklist

- [ ] CI runs unit + integration on every PR
- [ ] Playwright smoke suite on preview deploy
- [ ] Load test join endpoint (k6): 50 concurrent joins, 1 slot

---

# Phase 7 — Deployment

**Goal:** Production on Vercel with managed PostgreSQL.  
**Duration:** Week 13–14

## 7.1 Environments

| Env | Web | Database | Firebase |
|-----|-----|----------|----------|
| Development | localhost:3000 | Local / Neon branch | Dev project |
| Preview | Vercel PR URL | Neon branch | Staging |
| Production | gamepool.app | Neon prod | Prod project |

## 7.2 Vercel Configuration

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "0 * * * *" },
    { "path": "/api/cron/expire-requests", "schedule": "*/15 * * * *" }
  ]
}
```

- Enable Vercel Analytics + Speed Insights
- Sentry for error tracking (`SENTRY_DSN`)
- CSP headers for Firebase domains

## 7.3 Database Production

- Neon / Vercel Postgres with connection pooler
- `prisma migrate deploy` in CI/CD before traffic shift
- Daily backups; PITR enabled
- Read replica optional at 50k+ users for discovery queries

## 7.4 Firebase Production

- Separate projects per environment
- Storage rules: users can write own `avatars/{userId}/*`
- FCM VAPID key in env for web push
- App Check (recommended before public launch)

## 7.5 Launch Checklist

- [ ] Privacy policy + terms published
- [ ] Age gate (13+) on sign-up
- [ ] Rate limits on auth and join endpoints
- [ ] Admin account created; password rotated
- [ ] Monitoring alerts: 5xx rate, DB connections, cron failures
- [ ] Runbook: rollback deploy, suspend abusive user, hide match

## 7.6 Scalability Notes (100k Users)

| Concern | MVP approach | Scale trigger |
|---------|--------------|---------------|
| Discovery queries | Indexed SQL + TanStack Query cache | Add Redis cache at 5k DAU |
| Notifications | PostgreSQL + FCM | Partition `notifications` at 5M rows |
| Join hot path | Row-level lock on `matches` | Monitor lock wait p95 |
| Serverless DB connections | Pooler + singleton Prisma | — |
| Admin metrics | Live SQL aggregates | Materialized views at 10k DAU |

---

## Development Roadmap (Sprint Plan)

| Sprint | Weeks | Focus | Exit criteria |
|--------|-------|-------|---------------|
| **S0** | 1–2 | Phase 1 Foundation | Auth bootstrap works |
| **S1** | 3 | Users, profiles, sports, availability | Onboarding API complete |
| **S2** | 4 | Matches CRUD + lifecycle + visibility | Create/publish match |
| **S3** | 5 | Join requests, participants, waitlist | Join flow end-to-end |
| **S4** | 6 | Connections, invites, blocks | Coordination APIs done |
| **S5** | 7 | Teammate + opponent requests | All Phase 2 APIs |
| **S6** | 8–9 | Consumer UI S01–S24 | Discover + create + join |
| **S7** | 10 | Consumer UI S25–S35 + polish | Full consumer MVP |
| **S8** | 11 | Admin panel + reports | FR-36–40 |
| **S9** | 12 | Notifications + FCM + crons | Push working |
| **S10** | 13–14 | Testing + deployment | Production launch |

---

## Immediate Next Steps (Day 1)

1. `pnpm init` + workspace setup per §1.1
2. Scaffold `apps/web` with Next.js 15, Tailwind, shadcn
3. `pnpm db:migrate:dev` against local PostgreSQL
4. Implement `packages/database` + `packages/shared`
5. Ship `POST /api/v1/auth/bootstrap` + `GET /api/v1/users/me`
6. Ship S01–S04 auth screens with Firebase phone/email

---

## Document References

| Doc | Use |
|-----|-----|
| `PRD.md` | Features, screens, FRs, edge cases |
| `database-design.md` | Schema, indexes, relationships |
| `prisma/schema.prisma` | ORM source of truth |
| `prisma/migrations/00003_schema_supplement/` | Latest schema delta |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-23 | Engineering | Initial MVP implementation plan |
