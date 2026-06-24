# GamePool — REST API Contract

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** June 23, 2026  
**Base URL:** `https://api.gamepool.app`  
**API Version:** `v1`  
**Stack:** NestJS · PostgreSQL · Prisma · Firebase Auth

---

## Document Summary

This document defines the REST API contract for GamePool MVP across five NestJS modules: **Auth**, **Users**, **Sports**, **Matches**, and **Notifications**. Authentication is delegated to **Firebase Auth** (phone/email OTP on the client); the API validates Firebase ID tokens and maps `firebase_uid` to internal `users.id` via Prisma.

**Related documents:** [`PRD.md`](./PRD.md) · [`database-design.md`](./database-design.md)

---

## 1. API Standards

### 1.1 Protocol & Format

| Rule | Standard |
|------|----------|
| Protocol | HTTPS only (TLS 1.2+) |
| Content-Type | `application/json; charset=utf-8` |
| Request body | JSON unless noted (e.g., multipart for avatar upload — post-MVP) |
| Response body | JSON envelope (see §1.2) |
| Character encoding | UTF-8 |
| Timestamps | ISO 8601 UTC (`2026-06-23T14:30:00.000Z`) |
| IDs | UUID v4 strings |
| Nulls | Explicit `null` in responses; omit optional fields only when documented as optional-on-write |

### 1.2 Response Envelope

All successful responses use a consistent envelope:

```json
{
  "data": { },
  "meta": { },
  "links": { }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `data` | Yes | Single resource object, array, or `null` for empty deletes |
| `meta` | No | Pagination, counts, request metadata |
| `links` | No | HATEOAS links (`self`, `next`, `prev`) |

**Single resource:**

```json
{
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "type": "match",
    "attributes": { }
  }
}
```

**Collection (flat — preferred for MVP simplicity):**

```json
{
  "data": [
    { "id": "...", "title": "Sunday 5-a-side" }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 142,
    "totalPages": 8
  },
  "links": {
    "self": "/v1/matches?page=1&pageSize=20",
    "next": "/v1/matches?page=2&pageSize=20",
    "prev": null
  }
}
```

> **NestJS implementation:** Use a global `TransformInterceptor` to wrap controller return values in `{ data }`. Pagination via custom `@Paginated()` decorator populating `meta` and `links`.

### 1.3 Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes (protected routes) | `Bearer <firebase_id_token>` |
| `Content-Type` | Yes (writes) | `application/json` |
| `Accept` | Recommended | `application/json` |
| `X-Request-Id` | Optional | Client-generated UUID for tracing; echoed in error responses |
| `X-Idempotency-Key` | Optional | UUID for idempotent POST (join match, bootstrap); TTL 24h |

### 1.4 HTTP Methods

| Method | Usage |
|--------|-------|
| `GET` | Read; safe, idempotent |
| `POST` | Create or actions (`/join`, `/publish`) |
| `PATCH` | Partial update |
| `PUT` | Full replace (e.g., replace all user sports) |
| `DELETE` | Soft delete or cancel where applicable |

### 1.5 Pagination

Offset pagination for MVP (simple, Prisma-friendly). Cursor pagination reserved for notifications at scale.

**Query parameters:**

| Param | Type | Default | Max | Description |
|-------|------|---------|-----|-------------|
| `page` | integer | `1` | — | 1-based page index |
| `pageSize` | integer | `20` | `100` | Items per page |

**Response `meta`:**

```json
{
  "page": 1,
  "pageSize": 20,
  "totalItems": 142,
  "totalPages": 8
}
```

### 1.6 Filtering

Filter query params use camelCase. Multiple values for the same filter are comma-separated.

| Pattern | Example | Description |
|---------|---------|-------------|
| Equality | `?sportId=uuid` | Exact match |
| Multi-value | `?status=OPEN,FULL` | OR within field |
| Range | `?startsAtFrom=2026-06-01T00:00:00Z&startsAtTo=2026-06-30T23:59:59Z` | Inclusive UTC range |
| Search | `?q=sunday` | Case-insensitive text search (where supported) |
| Geo (MVP) | `?city=Mumbai&area=Andheri` | Location filters; PostGIS `?lat=&lng=&radiusKm=` in Phase 2 |

### 1.7 Sorting

| Param | Format | Example |
|-------|--------|---------|
| `sort` | comma-separated fields; `-` prefix = DESC | `sort=-startsAt,title` |

**Default sorts:**

| Resource | Default `sort` |
|----------|----------------|
| Matches (discovery) | `-startsAt` |
| Users (search) | `displayName` |
| Notifications | `-createdAt` |
| Sports | `sortOrder` |

### 1.8 Authentication (Firebase Auth)

```mermaid
sequenceDiagram
    participant Client
    participant Firebase
    participant API as GamePool API
    participant DB as PostgreSQL

    Client->>Firebase: signInWithPhoneNumber / signInWithEmail
    Firebase-->>Client: Firebase ID Token (JWT)
    Client->>API: POST /v1/auth/bootstrap + Bearer token
    API->>Firebase: verifyIdToken (Admin SDK)
    API->>DB: upsert User by firebase_uid
    API-->>Client: { user, profileComplete }
    Client->>API: GET /v1/matches + Bearer token
    API->>Firebase: verifyIdToken
    API-->>Client: matches list
```

| Step | Responsibility |
|------|----------------|
| Client | Firebase SDK sign-in; refresh ID token before expiry (~1h) |
| API | `FirebaseAuthGuard` validates JWT via Firebase Admin SDK |
| API | `@CurrentUser()` decorator injects `{ userId, firebaseUid, email, phone }` |
| DB | `users.firebase_uid` UNIQUE; created on bootstrap |

**Token rules:**

- Accept only unexpired Firebase ID tokens in `Authorization` header.
- Reject tokens with `aud` mismatch (wrong Firebase project).
- Map `sub` claim → `firebase_uid`.
- Return `401` with `AUTH_TOKEN_EXPIRED` when expired; client refreshes via Firebase SDK.

### 1.9 Authorization

Role model is **resource-based**, not RBAC-heavy for MVP.

| Guard | Scope | Rule |
|-------|-------|------|
| `FirebaseAuthGuard` | Global on protected routes | Valid Firebase token |
| `ProfileCompleteGuard` | Write actions (join, create match) | `profile.displayName` + `city` + ≥1 sport |
| `MatchHostGuard` | `PATCH/DELETE` match, participant approve/remove | `match.hostUserId === currentUser.id` |
| `MatchParticipantGuard` | Leave match | User is participant |
| `SelfOnlyGuard` | `PATCH /users/me` | `userId === currentUser.id` |
| `PublicProfileGuard` | `GET /users/:id` | Profile visibility rules |

**Profile visibility (`CONNECTIONS_ONLY`):** Return `403 PROFILE_PRIVATE` to non-connections (connections epic post-MVP; treat as private except self).

**Account states:**

| `user.status` | API behavior |
|---------------|--------------|
| `ACTIVE` | Full access |
| `PENDING_VERIFICATION` | Read-only + bootstrap/onboarding |
| `SUSPENDED` | `403 ACCOUNT_SUSPENDED` on all routes |
| `DEACTIVATED` | `401` — token invalidated on next sync |

### 1.10 Idempotency

Required for:

- `POST /v1/auth/bootstrap`
- `POST /v1/matches/:matchId/join`

Client sends `X-Idempotency-Key: <uuid>`. Server stores `(userId, key, route, response_hash)` for 24h and returns cached response on replay.

### 1.11 Rate Limiting

| Tier | Limit | Scope |
|------|-------|-------|
| Anonymous | 30 req/min | Health, docs only |
| Authenticated | 120 req/min | Per `userId` |
| Write-heavy | 20 req/min | POST/PATCH/DELETE per user |
| Search | 60 req/min | `GET /users`, `GET /matches` |

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.  
Exceeded → `429 RATE_LIMIT_EXCEEDED`.

---

## 2. Endpoint List

### 2.1 Auth Module — `/v1/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/v1/auth/bootstrap` | Bearer | First login: create/link local user from Firebase |
| `GET` | `/v1/auth/me` | Bearer | Current user, profile summary, onboarding state |
| `DELETE` | `/v1/auth/session` | Bearer | Logout: revoke FCM tokens, optional audit |
| `DELETE` | `/v1/auth/account` | Bearer | Soft-delete account (GDPR flow) |

### 2.2 Users Module — `/v1/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/users/me` | Bearer | Full profile + sports + stats |
| `PATCH` | `/v1/users/me` | Bearer | Update profile fields |
| `GET` | `/v1/users/me/sports` | Bearer | List current user's sports |
| `PUT` | `/v1/users/me/sports` | Bearer | Replace entire sports list |
| `POST` | `/v1/users/me/sports` | Bearer | Add one sport preference |
| `PATCH` | `/v1/users/me/sports/:sportId` | Bearer | Update skill / isPrimary |
| `DELETE` | `/v1/users/me/sports/:sportId` | Bearer | Remove sport preference |
| `PATCH` | `/v1/users/me/preferences` | Bearer | Notification toggles, timezone |
| `GET` | `/v1/users` | Bearer | Search/discover players |
| `GET` | `/v1/users/:userId` | Bearer | Public profile by ID |
| `GET` | `/v1/users/me/matches` | Bearer | Matches hosted or joined |

**`GET /v1/users` filters:** `sportId`, `skillLevel`, `city`, `area`, `q`  
**`GET /v1/users` sort:** `displayName`, `-createdAt`  
**`GET /v1/users/me/matches` filters:** `role=hosted|joined`, `status`, `sportId`, `startsAtFrom`, `startsAtTo`

### 2.3 Sports Module — `/v1/sports`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/sports` | Optional | List active sports (public catalog) |
| `GET` | `/v1/sports/:sportIdOrSlug` | Optional | Sport detail by UUID or slug |

**`GET /v1/sports` filters:** `isActive` (default `true`)  
**`GET /v1/sports` sort:** `sortOrder` (default)

### 2.4 Matches Module — `/v1/matches`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/matches` | Bearer | Discover/browse matches |
| `POST` | `/v1/matches` | Bearer + Profile | Create match (default `DRAFT`) |
| `GET` | `/v1/matches/:matchId` | Bearer | Match detail + roster summary |
| `PATCH` | `/v1/matches/:matchId` | Bearer + Host | Update match fields |
| `DELETE` | `/v1/matches/:matchId` | Bearer + Host | Cancel match (`status=CANCELLED`) |
| `POST` | `/v1/matches/:matchId/publish` | Bearer + Host | `DRAFT` → `OPEN` |
| `POST` | `/v1/matches/:matchId/join` | Bearer + Profile | Join or request join |
| `POST` | `/v1/matches/:matchId/leave` | Bearer | Leave match |
| `GET` | `/v1/matches/:matchId/participants` | Bearer | List participants / waitlist |
| `POST` | `/v1/matches/:matchId/participants/:participantId/approve` | Bearer + Host | Approve `PENDING` |
| `POST` | `/v1/matches/:matchId/participants/:participantId/decline` | Bearer + Host | Decline `PENDING` |
| `DELETE` | `/v1/matches/:matchId/participants/:participantId` | Bearer + Host | Remove participant |

**`GET /v1/matches` filters:** `sportId`, `status`, `visibility`, `city`, `area`, `skillLevelExpected`, `startsAtFrom`, `startsAtTo`, `hostUserId`, `q`  
**`GET /v1/matches` sort:** `-startsAt` (default), `startsAt`, `-createdAt`

### 2.5 Notifications Module — `/v1/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/notifications` | Bearer | Inbox (paginated) |
| `GET` | `/v1/notifications/unread-count` | Bearer | Unread badge count |
| `PATCH` | `/v1/notifications/:notificationId/read` | Bearer | Mark one as read |
| `POST` | `/v1/notifications/read-all` | Bearer | Mark all as read |
| `DELETE` | `/v1/notifications/:notificationId` | Bearer | Soft-delete notification |

**`GET /v1/notifications` filters:** `isRead` (`true`/`false`), `type`  
**`GET /v1/notifications` sort:** `-createdAt` (default)

### 2.6 Health (Infrastructure)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Liveness |
| `GET` | `/health/ready` | No | DB + Firebase connectivity |

---

## 3. Request Examples

### 3.1 Auth — Bootstrap

Creates local user on first Firebase sign-in. Idempotent per `firebase_uid`.

```http
POST /v1/auth/bootstrap HTTP/1.1
Host: api.gamepool.app
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json
X-Idempotency-Key: 7c9e6679-7425-40de-944b-e07fc1f90ae7

{
  "displayName": "Arjun Mehta",
  "city": "Mumbai",
  "area": "Andheri West",
  "timezone": "Asia/Kolkata",
  "sports": [
    { "sportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "skillLevel": "INTERMEDIATE", "isPrimary": true },
    { "sportSlug": "badminton", "skillLevel": "BEGINNER", "isPrimary": false }
  ]
}
```

**Minimal bootstrap (profile completed later):**

```json
{}
```

### 3.2 Users — Update Profile

```http
PATCH /v1/users/me HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{
  "displayName": "Arjun M.",
  "bio": "Weekend footballer. Looking for 5-a-side games.",
  "area": "Bandra",
  "latitude": 19.0596,
  "longitude": 72.8295,
  "profileVisibility": "PUBLIC",
  "avatarUrl": "https://cdn.gamepool.app/avatars/abc.jpg"
}
```

### 3.3 Users — Replace Sports

```http
PUT /v1/users/me/sports HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{
  "sports": [
    { "sportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "skillLevel": "ADVANCED", "isPrimary": true },
    { "sportId": "b2c3d4e5-f6a7-8901-bcde-f12345678901", "skillLevel": "OPEN", "isPrimary": false }
  ]
}
```

### 3.4 Users — Search Players

```http
GET /v1/users?sportId=a1b2c3d4-e5f6-7890-abcd-ef1234567890&skillLevel=INTERMEDIATE,ADVANCED&city=Mumbai&page=1&pageSize=20&sort=displayName HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### 3.5 Matches — Create

```http
POST /v1/matches HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{
  "sportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Sunday Morning 5-a-side",
  "format": "5-a-side",
  "notes": "Bring white + dark bibs. No studs on turf.",
  "visibility": "PUBLIC",
  "skillLevelExpected": "INTERMEDIATE",
  "startsAt": "2026-06-29T06:00:00.000Z",
  "durationMinutes": 90,
  "venueName": "Andheri Sports Turf",
  "venueAddress": "Veera Desai Rd, Andheri West, Mumbai",
  "venueLatitude": 19.1364,
  "venueLongitude": 72.8297,
  "city": "Mumbai",
  "area": "Andheri West",
  "maxParticipants": 10,
  "waitlistEnabled": true,
  "leaveCutoffHours": 2,
  "publish": false
}
```

### 3.6 Matches — Publish

```http
POST /v1/matches/3fa85f64-5717-4562-b3fc-2c963f66afa6/publish HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### 3.7 Matches — Join

```http
POST /v1/matches/3fa85f64-5717-4562-b3fc-2c963f66afa6/join HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "message": "Happy to play midfield."
}
```

### 3.8 Matches — Approve Participant

```http
POST /v1/matches/3fa85f64-5717-4562-b3fc-2c963f66afa6/participants/8b3e2f10-9a4c-4d1e-b2f3-6c7d8e9f0a1b/approve HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### 3.9 Matches — Discover

```http
GET /v1/matches?sportId=a1b2c3d4-e5f6-7890-abcd-ef1234567890&status=OPEN,FULL&city=Mumbai&startsAtFrom=2026-06-23T00:00:00.000Z&startsAtTo=2026-07-07T23:59:59.000Z&sort=-startsAt&page=1&pageSize=20 HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### 3.10 Notifications — Mark Read

```http
PATCH /v1/notifications/9f8e7d6c-5b4a-3210-fedc-ba9876543210/read HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### 3.11 Users — Notification Preferences

```http
PATCH /v1/users/me/preferences HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{
  "emailNotificationsEnabled": true,
  "pushNotificationsEnabled": false,
  "timezone": "Asia/Kolkata"
}
```

---

## 4. Response Examples

### 4.1 Auth — Bootstrap (201 Created)

```json
{
  "data": {
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "arjun@example.com",
      "phone": "+919876543210",
      "status": "ACTIVE",
      "emailVerified": true,
      "phoneVerified": true,
      "createdAt": "2026-06-23T10:00:00.000Z"
    },
    "profile": {
      "displayName": "Arjun Mehta",
      "city": "Mumbai",
      "area": "Andheri West",
      "profileVisibility": "PUBLIC",
      "avatarUrl": null,
      "bio": null,
      "timezone": "Asia/Kolkata"
    },
    "sports": [
      {
        "id": "us-uuid-1",
        "sportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "sportSlug": "football",
        "sportName": "Football",
        "skillLevel": "INTERMEDIATE",
        "isPrimary": true
      }
    ],
    "profileComplete": true,
    "isNewUser": true
  }
}
```

### 4.2 Auth — Me (200 OK)

```json
{
  "data": {
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "arjun@example.com",
      "phone": "+919876543210",
      "status": "ACTIVE",
      "lastLoginAt": "2026-06-23T14:22:00.000Z"
    },
    "profileComplete": true,
    "onboarding": {
      "hasProfile": true,
      "hasSports": true,
      "hasLocation": true
    }
  }
}
```

### 4.3 Users — Me (200 OK)

```json
{
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "displayName": "Arjun Mehta",
    "avatarUrl": "https://cdn.gamepool.app/avatars/abc.jpg",
    "bio": "Weekend footballer.",
    "city": "Mumbai",
    "area": "Andheri West",
    "profileVisibility": "PUBLIC",
    "timezone": "Asia/Kolkata",
    "emailNotificationsEnabled": true,
    "pushNotificationsEnabled": true,
    "sports": [
      {
        "sportId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "slug": "football",
        "name": "Football",
        "skillLevel": "INTERMEDIATE",
        "isPrimary": true
      }
    ],
    "stats": {
      "matchesJoined": 24,
      "matchesHosted": 8,
      "memberSince": "2026-01-15T08:00:00.000Z"
    },
    "createdAt": "2026-01-15T08:00:00.000Z",
    "updatedAt": "2026-06-23T12:00:00.000Z"
  }
}
```

### 4.4 Users — Search (200 OK)

```json
{
  "data": [
    {
      "id": "8b3e2f10-9a4c-4d1e-b2f3-6c7d8e9f0a1b",
      "displayName": "Priya Sharma",
      "avatarUrl": null,
      "city": "Mumbai",
      "area": "Powai",
      "sports": [
        { "slug": "cricket", "skillLevel": "BEGINNER" }
      ],
      "matchesJoined": 5
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  },
  "links": {
    "self": "/v1/users?sportId=a1b2c3d4-e5f6-7890-abcd-ef1234567890&page=1&pageSize=20",
    "next": null,
    "prev": null
  }
}
```

### 4.5 Sports — List (200 OK)

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "slug": "football",
      "name": "Football",
      "isActive": true,
      "sortOrder": 1,
      "formats": ["5-a-side", "7-a-side", "11-a-side"]
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "slug": "cricket",
      "name": "Cricket",
      "isActive": true,
      "sortOrder": 2,
      "formats": ["T10", "T20", "practice-nets"]
    },
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "slug": "badminton",
      "name": "Badminton",
      "isActive": true,
      "sortOrder": 3,
      "formats": ["singles", "doubles", "mixed"]
    }
  ]
}
```

> `formats` is API-layer metadata (static map in Sports module); not stored in DB for MVP.

### 4.6 Matches — Detail (200 OK)

```json
{
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "title": "Sunday Morning 5-a-side",
    "format": "5-a-side",
    "notes": "Bring white + dark bibs.",
    "status": "OPEN",
    "visibility": "PUBLIC",
    "skillLevelExpected": "INTERMEDIATE",
    "startsAt": "2026-06-29T06:00:00.000Z",
    "endsAt": "2026-06-29T07:30:00.000Z",
    "durationMinutes": 90,
    "venue": {
      "name": "Andheri Sports Turf",
      "address": "Veera Desai Rd, Andheri West, Mumbai",
      "latitude": 19.1364,
      "longitude": 72.8297,
      "city": "Mumbai",
      "area": "Andheri West"
    },
    "capacity": {
      "maxParticipants": 10,
      "confirmedCount": 7,
      "slotsRemaining": 3,
      "waitlistEnabled": true,
      "waitlistCount": 1
    },
    "sport": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "slug": "football",
      "name": "Football"
    },
    "host": {
      "id": "host-uuid",
      "displayName": "Rahul K.",
      "avatarUrl": null
    },
    "myParticipation": {
      "participantId": null,
      "status": null,
      "canJoin": true,
      "canLeave": false
    },
    "leaveCutoffHours": 2,
    "createdAt": "2026-06-23T11:00:00.000Z",
    "updatedAt": "2026-06-23T11:00:00.000Z"
  }
}
```

### 4.7 Matches — Join (200 OK)

**Auto-confirmed (public match, slots available):**

```json
{
  "data": {
    "participant": {
      "id": "part-uuid",
      "matchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "role": "PARTICIPANT",
      "status": "CONFIRMED",
      "joinedAt": "2026-06-23T14:30:00.000Z"
    },
    "matchStatus": "OPEN",
    "slotsRemaining": 2
  }
}
```

**Pending host approval:**

```json
{
  "data": {
    "participant": {
      "id": "part-uuid",
      "status": "PENDING",
      "joinedAt": null
    },
    "matchStatus": "OPEN",
    "slotsRemaining": 2
  }
}
```

**Waitlisted:**

```json
{
  "data": {
    "participant": {
      "id": "part-uuid",
      "status": "WAITLIST",
      "joinedAt": null
    },
    "matchStatus": "FULL",
    "slotsRemaining": 0
  }
}
```

### 4.8 Matches — Participants (200 OK)

```json
{
  "data": {
    "confirmed": [
      {
        "id": "p1",
        "user": { "id": "host-uuid", "displayName": "Rahul K.", "avatarUrl": null },
        "role": "HOST",
        "status": "CONFIRMED",
        "joinedAt": "2026-06-23T11:00:00.000Z"
      },
      {
        "id": "p2",
        "user": { "id": "u2", "displayName": "Arjun M.", "avatarUrl": null },
        "role": "PARTICIPANT",
        "status": "CONFIRMED",
        "joinedAt": "2026-06-23T12:00:00.000Z"
      }
    ],
    "pending": [
      {
        "id": "p3",
        "user": { "id": "u3", "displayName": "Sneha R.", "avatarUrl": null },
        "role": "PARTICIPANT",
        "status": "PENDING",
        "joinedAt": null
      }
    ],
    "waitlist": []
  }
}
```

### 4.9 Notifications — Inbox (200 OK)

```json
{
  "data": [
    {
      "id": "9f8e7d6c-5b4a-3210-fedc-ba9876543210",
      "type": "MATCH_JOIN_REQUEST",
      "title": "New join request",
      "body": "Sneha R. wants to join Sunday Morning 5-a-side.",
      "payload": {
        "matchId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "participantId": "p3",
        "requesterId": "u3"
      },
      "entityType": "MATCH",
      "entityId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "isRead": false,
      "readAt": null,
      "createdAt": "2026-06-23T14:25:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 12,
    "totalPages": 1,
    "unreadCount": 3
  },
  "links": {
    "self": "/v1/notifications?page=1&pageSize=20",
    "next": null,
    "prev": null
  }
}
```

### 4.10 Notifications — Unread Count (200 OK)

```json
{
  "data": {
    "unreadCount": 3
  }
}
```

### 4.11 Delete — Cancel Match (200 OK)

```json
{
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "status": "CANCELLED",
    "cancelledAt": "2026-06-23T15:00:00.000Z"
  }
}
```

---

## 5. Error Codes

### 5.1 Error Response Format (RFC 7807–inspired)

```json
{
  "error": {
    "code": "MATCH_FULL",
    "message": "This match has no remaining slots.",
    "status": 409,
    "details": [
      {
        "field": "matchId",
        "message": "confirmedCount equals maxParticipants"
      }
    ],
    "requestId": "req_01JY2XK3N4W5Z6A7B8C9D0E1F",
    "docsUrl": "https://docs.gamepool.app/errors/MATCH_FULL"
  }
}
```

| Field | Description |
|-------|-------------|
| `code` | Machine-readable, stable string (SCREAMING_SNAKE_CASE) |
| `message` | Human-readable summary (safe for UI) |
| `status` | HTTP status code (duplicate for convenience) |
| `details` | Optional validation field errors |
| `requestId` | Correlation ID from `X-Request-Id` or server-generated |
| `docsUrl` | Link to error documentation |

### 5.2 HTTP Status Usage

| Status | Usage |
|--------|-------|
| `400` | Malformed JSON, invalid query params |
| `401` | Missing/invalid/expired Firebase token |
| `403` | Authenticated but not allowed (suspended, private profile, not host) |
| `404` | Resource not found or soft-deleted |
| `409` | Conflict (match full, duplicate join, invalid state transition) |
| `422` | Validation failed (semantic/business rules) |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error |
| `503` | Dependency unavailable (DB, Firebase) |

### 5.3 Error Code Catalog

#### Authentication (`AUTH_*`)

| Code | HTTP | Description |
|------|------|-------------|
| `AUTH_TOKEN_MISSING` | 401 | No `Authorization` header |
| `AUTH_TOKEN_INVALID` | 401 | Token malformed or signature invalid |
| `AUTH_TOKEN_EXPIRED` | 401 | Firebase ID token expired |
| `AUTH_TOKEN_REVOKED` | 401 | Token revoked (account disabled in Firebase) |
| `AUTH_FIREBASE_ERROR` | 503 | Firebase Admin SDK unavailable |
| `AUTH_BOOTSTRAP_REQUIRED` | 403 | Local user not found; call `/auth/bootstrap` |

#### Authorization (`ACCESS_*`)

| Code | HTTP | Description |
|------|------|-------------|
| `ACCESS_DENIED` | 403 | Generic forbidden |
| `ACCOUNT_SUSPENDED` | 403 | User status is `SUSPENDED` |
| `ACCOUNT_DEACTIVATED` | 401 | User soft-deleted |
| `PROFILE_INCOMPLETE` | 403 | ProfileCompleteGuard failed |
| `PROFILE_PRIVATE` | 403 | Target profile is `CONNECTIONS_ONLY` |
| `NOT_MATCH_HOST` | 403 | Action requires match host |
| `NOT_MATCH_PARTICIPANT` | 403 | Action requires participation |

#### Validation (`VALIDATION_*`)

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_FAILED` | 422 | Generic DTO validation failure |
| `INVALID_UUID` | 400 | Path/query ID not valid UUID |
| `INVALID_ENUM` | 422 | Enum value not allowed |
| `INVALID_DATE_RANGE` | 422 | `startsAtFrom` > `startsAtTo` |
| `INVALID_PAGINATION` | 400 | `page` or `pageSize` out of range |
| `INVALID_SORT_FIELD` | 400 | Unknown sort field |
| `SPORT_NOT_FOUND` | 422 | `sportId` does not exist |
| `INVALID_SKILL_LEVEL` | 422 | Skill level not allowed for sport |

#### Users (`USER_*`)

| Code | HTTP | Description |
|------|------|-------------|
| `USER_NOT_FOUND` | 404 | User ID not found |
| `USER_SPORT_NOT_FOUND` | 404 | User sport preference not found |
| `USER_SPORT_DUPLICATE` | 409 | Sport already added |
| `USER_SPORT_MIN_ONE` | 422 | Cannot remove last sport |

#### Matches (`MATCH_*`)

| Code | HTTP | Description |
|------|------|-------------|
| `MATCH_NOT_FOUND` | 404 | Match not found |
| `MATCH_NOT_JOINABLE` | 409 | Status not `OPEN` or past start |
| `MATCH_FULL` | 409 | No slots; waitlist disabled |
| `MATCH_ALREADY_JOINED` | 409 | User already participant |
| `MATCH_HOST_CANNOT_LEAVE` | 422 | Host cannot leave; cancel instead |
| `MATCH_LEAVE_CUTOFF_PASSED` | 422 | Past leave cutoff; host approval required |
| `MATCH_INVALID_STATUS_TRANSITION` | 409 | e.g., publish cancelled match |
| `MATCH_STARTS_IN_PAST` | 422 | `startsAt` must be in future on publish |
| `PARTICIPANT_NOT_FOUND` | 404 | Participant ID invalid |
| `PARTICIPANT_NOT_PENDING` | 409 | Approve/decline only for `PENDING` |
| `INVITE_ONLY_MATCH` | 403 | Join not allowed without invite (post-MVP) |

#### Notifications (`NOTIFICATION_*`)

| Code | HTTP | Description |
|------|------|-------------|
| `NOTIFICATION_NOT_FOUND` | 404 | Notification not found or not owned |

#### System (`SYSTEM_*`)

| Code | HTTP | Description |
|------|------|-------------|
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Same key, different request body |
| `INTERNAL_ERROR` | 500 | Unhandled exception |
| `SERVICE_UNAVAILABLE` | 503 | Health check failing |

### 5.4 Validation Error Example

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed.",
    "status": 422,
    "details": [
      { "field": "startsAt", "message": "must be a valid ISO 8601 date" },
      { "field": "maxParticipants", "message": "must be between 2 and 50" }
    ],
    "requestId": "req_01JY2XK3N4W5Z6A7B8C9D0E1F"
  }
}
```

---

## 6. Versioning Strategy

### 6.1 URL Path Versioning (MVP)

All business endpoints are prefixed with `/v1/`:

```
https://api.gamepool.app/v1/matches
```

Health endpoints remain unversioned: `/health`, `/health/ready`.

### 6.2 Version Lifecycle

| Phase | Duration | Policy |
|-------|----------|--------|
| **Current** (`v1`) | Active development | Breaking changes avoided; additive only |
| **Deprecated** | 6 months min | `Sunset` + `Deprecation` headers on old version |
| **Retired** | — | Returns `410 Gone` with migration URL |

### 6.3 Deprecation Headers

When `v1` is superseded:

```http
Deprecation: true
Sunset: Sat, 01 Jan 2028 00:00:00 GMT
Link: <https://docs.gamepool.app/api/v2-migration>; rel="successor-version"
```

### 6.4 Breaking vs Non-Breaking Changes

| Non-breaking (same version) | Breaking (new major version) |
|-----------------------------|------------------------------|
| Add optional request fields | Remove or rename fields |
| Add response fields | Change field types |
| Add endpoints | Change error codes |
| Add enum values (clients must tolerate unknown) | Remove enum values |
| Add filters / sort fields | Change auth model |

### 6.5 OpenAPI & SDK Versioning

- OpenAPI spec version tracks API: `info.version: "1.0.0"` (semver for spec document).
- URL path major version (`v1`) increments on breaking changes.
- Generated client packages: `@gamepool/api-client@1.x` maps to `/v1/`.

### 6.6 Firebase & Backend Coupling

Firebase project rotation or token claim changes are **not** API version bumps — handle via configuration and dual-validation window. Document in ops runbook, not consumer-facing version.

---

## 7. OpenAPI Structure

### 7.1 NestJS Swagger Setup

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('GamePool API')
  .setDescription('Sports networking platform — MVP REST API')
  .setVersion('1.0.0')
  .addServer('https://api.gamepool.app', 'Production')
  .addServer('https://api.staging.gamepool.app', 'Staging')
  .addBearerAuth(
    { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Firebase ID Token' },
    'firebase',
  )
  .addTag('Auth', 'Firebase bootstrap and session')
  .addTag('Users', 'Profiles and player discovery')
  .addTag('Sports', 'Sport catalog')
  .addTag('Matches', 'Match CRUD and participation')
  .addTag('Notifications', 'In-app notification inbox')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document, {
  jsonDocumentUrl: 'docs/openapi.json',
});
```

**URLs:**

| Environment | Swagger UI | OpenAPI JSON |
|-------------|------------|--------------|
| Production | `https://api.gamepool.app/docs` | `https://api.gamepool.app/docs/openapi.json` |
| Local | `http://localhost:3000/docs` | `http://localhost:3000/docs/openapi.json` |

### 7.2 Document Organization

```
openapi: 3.1.0
info:
  title: GamePool API
  version: 1.0.0

servers:
  - url: https://api.gamepool.app
    description: Production

tags:
  - name: Auth
  - name: Users
  - name: Sports
  - name: Matches
  - name: Notifications

paths:
  /v1/auth/bootstrap: ...
  /v1/auth/me: ...
  /v1/users/me: ...
  /v1/sports: ...
  /v1/matches: ...
  /v1/notifications: ...

components:
  securitySchemes:
    firebase:
      type: http
      scheme: bearer
      bearerFormat: JWT

  parameters:
    PageParam: ...
    PageSizeParam: ...
    SortParam: ...

  schemas:
    # ── Enums ──
    UserStatus: ...
    SkillLevel: ...
    MatchStatus: ...
    MatchVisibility: ...
    ParticipantStatus: ...
    ParticipantRole: ...
    NotificationType: ...
    ProfileVisibility: ...

    # ── Shared ──
    ApiResponse: ...
    PaginatedMeta: ...
    PaginationLinks: ...
    ErrorResponse: ...
    ValidationDetail: ...

    # ── Auth ──
    BootstrapRequest: ...
    BootstrapResponse: ...
    AuthMeResponse: ...

    # ── Users ──
    UserProfile: ...
    UserProfileUpdate: ...
    UserSport: ...
    UserSportInput: ...
    UserPublic: ...
    UserPreferencesUpdate: ...
    UserStats: ...

    # ── Sports ──
    Sport: ...
    SportList: ...

    # ── Matches ──
    Match: ...
    MatchCreate: ...
    MatchUpdate: ...
    MatchVenue: ...
    MatchCapacity: ...
    MatchListItem: ...
    Participant: ...
    ParticipantUser: ...
    JoinMatchRequest: ...
    JoinMatchResponse: ...
    ParticipantList: ...

    # ── Notifications ──
    Notification: ...
    UnreadCount: ...

  responses:
    Unauthorized: ...
    Forbidden: ...
    NotFound: ...
    ValidationError: ...
    Conflict: ...
    RateLimited: ...

security:
  - firebase: []
```

### 7.3 Shared Schema Definitions

#### `SkillLevel` (enum)

```yaml
SkillLevel:
  type: string
  enum: [BEGINNER, INTERMEDIATE, ADVANCED, OPEN]
```

#### `MatchStatus` (enum)

```yaml
MatchStatus:
  type: string
  enum: [DRAFT, OPEN, FULL, CANCELLED, COMPLETED]
```

#### `PaginatedMeta` (schema)

```yaml
PaginatedMeta:
  type: object
  required: [page, pageSize, totalItems, totalPages]
  properties:
    page:
      type: integer
      minimum: 1
    pageSize:
      type: integer
      minimum: 1
      maximum: 100
    totalItems:
      type: integer
      minimum: 0
    totalPages:
      type: integer
      minimum: 0
```

#### `ErrorResponse` (schema)

```yaml
ErrorResponse:
  type: object
  required: [error]
  properties:
    error:
      type: object
      required: [code, message, status]
      properties:
        code:
          type: string
          example: MATCH_FULL
        message:
          type: string
        status:
          type: integer
        details:
          type: array
          items:
            $ref: '#/components/schemas/ValidationDetail'
        requestId:
          type: string
        docsUrl:
          type: string
          format: uri
```

#### `MatchCreate` (schema)

```yaml
MatchCreate:
  type: object
  required:
    - sportId
    - title
    - format
    - startsAt
    - venueName
    - city
    - maxParticipants
  properties:
    sportId:
      type: string
      format: uuid
    title:
      type: string
      minLength: 3
      maxLength: 200
    format:
      type: string
      maxLength: 50
    notes:
      type: string
      maxLength: 2000
    visibility:
      $ref: '#/components/schemas/MatchVisibility'
      default: PUBLIC
    skillLevelExpected:
      $ref: '#/components/schemas/SkillLevel'
      default: OPEN
    startsAt:
      type: string
      format: date-time
    durationMinutes:
      type: integer
      minimum: 15
      maximum: 480
    venueName:
      type: string
      maxLength: 200
    venueAddress:
      type: string
      maxLength: 500
    venueLatitude:
      type: number
      format: double
    venueLongitude:
      type: number
      format: double
    city:
      type: string
      maxLength: 100
    area:
      type: string
      maxLength: 100
    maxParticipants:
      type: integer
      minimum: 2
      maximum: 50
    waitlistEnabled:
      type: boolean
      default: false
    leaveCutoffHours:
      type: integer
      minimum: 0
      maximum: 72
      default: 2
    publish:
      type: boolean
      default: false
      description: If true, create and immediately publish (DRAFT → OPEN)
```

### 7.4 Module → OpenAPI Tag Mapping

| NestJS Module | Controller Prefix | OpenAPI Tag | DTO Folder |
|---------------|-------------------|-------------|------------|
| `AuthModule` | `auth` | `Auth` | `src/auth/dto/` |
| `UsersModule` | `users` | `Users` | `src/users/dto/` |
| `SportsModule` | `sports` | `Sports` | `src/sports/dto/` |
| `MatchesModule` | `matches` | `Matches` | `src/matches/dto/` |
| `NotificationsModule` | `notifications` | `Notifications` | `src/notifications/dto/` |

### 7.5 Cross-Cutting Decorators

| Decorator | OpenAPI effect |
|-----------|----------------|
| `@ApiBearerAuth('firebase')` | Security requirement on controller |
| `@ApiPaginatedResponse(MatchListItem)` | Wraps response with `data[]` + `meta` |
| `@ApiErrorResponse(409, 'MATCH_FULL')` | Documents error in `responses` |
| `@ApiIdempotencyKey()` | Documents `X-Idempotency-Key` header |

### 7.6 CI Contract Testing

```bash
# Export spec in CI
curl -s http://localhost:3000/docs/openapi.json -o openapi.json

# Validate breaking changes against main branch
npx @openapitools/openapi-diff main-openapi.json openapi.json

# Generate TypeScript client (optional)
npx @openapitools/openapi-generator-cli generate \
  -i openapi.json -g typescript-fetch -o packages/api-client
```

---

## Appendix A: Request Schema Reference

### `BootstrapRequest`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `displayName` | string | No | 2–100 chars |
| `city` | string | No | 1–100 chars |
| `area` | string | No | max 100 chars |
| `timezone` | string | No | IANA timezone |
| `sports` | array | No | See `UserSportInput` |

### `UserProfileUpdate`

| Field | Type | Required |
|-------|------|----------|
| `displayName` | string | No |
| `bio` | string | No |
| `avatarUrl` | string (uri) | No |
| `city` | string | No |
| `area` | string | No |
| `latitude` | number | No |
| `longitude` | number | No |
| `profileVisibility` | enum | No |

### `UserSportInput`

| Field | Type | Required |
|-------|------|----------|
| `sportId` | uuid | One of sportId/sportSlug |
| `sportSlug` | string | One of sportId/sportSlug |
| `skillLevel` | enum | Yes |
| `isPrimary` | boolean | No, default false |

### `JoinMatchRequest`

| Field | Type | Required |
|-------|------|----------|
| `message` | string | No, max 500 chars |

### `MatchUpdate`

All fields from `MatchCreate` optional; cannot change `sportId` after publish.

---

## Appendix B: Database Field Mapping (Prisma)

| API field | Prisma model.field |
|-----------|-------------------|
| `user.id` | `User.id` |
| `user.email` | `User.email` |
| `profile.displayName` | `UserProfile.displayName` |
| `sportId` | `Sport.id` |
| `match.status` | `Match.status` |
| `participant.status` | `MatchParticipant.status` |
| `notification.isRead` | `Notification.readAt != null` |

**Firebase mapping (add to Prisma migration):**

```prisma
model User {
  firebaseUid String @unique @map("firebase_uid") @db.VarChar(128)
  // ...
}
```

---

## Appendix C: NestJS Guard Pipeline

```
Request
  → FirebaseAuthGuard          (validate JWT)
  → UserStatusGuard            (reject SUSPENDED)
  → ProfileCompleteGuard       (optional per route)
  → ResourceGuard              (MatchHostGuard, etc.)
  → Controller
  → TransformInterceptor       ({ data, meta, links })
  → HttpExceptionFilter        ({ error })
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-23 | Engineering | Initial API contract for MVP |
