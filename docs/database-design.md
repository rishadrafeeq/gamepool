# GamePool — Database Design

**Version:** 2.0  
**Status:** Approved for MVP Development  
**Last Updated:** June 23, 2026  
**Database:** PostgreSQL 15+  
**ORM:** Prisma  
**Aligns with:** [`PRD.md`](./PRD.md) v2.1 (FR-1 through FR-47)  
**Target Scale:** 100k registered users, ~10k DAU, ~500k match participants (lifetime)

---

## Document Summary

This document defines the production-ready PostgreSQL schema for **GamePool MVP**, covering authentication, profiles, sports preferences, player discovery, Sports Connections, teammate/opponent requests, matches, invites, waitlists, notifications, safety (blocks/reports), and admin moderation.

All primary keys use **UUID v4** (`gen_random_uuid()`). Mutable business tables include **audit fields** (`created_at`, `updated_at`) and **soft delete** (`deleted_at`) where appropriate. The schema is **team-ready** and **venue-ready** for Phase 2+ expansion without redesigning core tables.

**MVP table count:** 19 tables (+ reference `sports`).

---

## Design Principles

| Principle | Implementation |
|-----------|----------------|
| UUID PKs | `uuid` type; default `gen_random_uuid()` |
| Soft delete | `deleted_at TIMESTAMPTZ NULL` on users, profiles, matches, participants, requests |
| Audit trail | `created_at`, `updated_at` on mutable tables; `admin_audit_events` for moderation |
| Referential integrity | Explicit FK `ON DELETE` behavior per relationship |
| Idempotent joins | Partial unique `(match_id, user_id)` on active `match_participants` |
| Coordination, not social | `sports_connections` + `match_invites`; no messaging tables |
| Visibility enforcement | `match_visibility` enum + application-layer connection/block checks |
| Team-ready | Nullable `team_id` on `matches`, `match_participants`, request tables |
| Venue-ready | `venue_name`/`venue_address` MVP; nullable `venue_id`, `venue_source` |
| Timezone safety | All timestamps `TIMESTAMPTZ` (UTC) |

---

## 1. ER Diagram

```mermaid
erDiagram
    users ||--o| user_profiles : "1:1"
    users ||--o{ refresh_tokens : "has"
    users ||--o{ otp_verifications : "by_identifier"
    users ||--o{ user_sports : "plays"
    sports ||--o{ user_sports : "categorizes"
    users ||--o{ matches : "hosts"
    sports ||--o{ matches : "for_sport"
    matches ||--o{ match_participants : "has"
    users ||--o{ match_participants : "joins"
    matches ||--o{ match_invites : "invites"
    users ||--o{ match_invites : "invitee"
    users ||--o{ sports_connections : "requester"
    users ||--o{ sports_connections : "recipient"
    users ||--o{ teammate_requests : "creates"
    sports ||--o{ teammate_requests : "sport"
    matches ||--o{ teammate_requests : "optional_link"
    teammate_requests ||--o{ teammate_request_interests : "has"
    users ||--o{ teammate_request_interests : "expresses"
    users ||--o{ opponent_requests : "creates"
    sports ||--o{ opponent_requests : "sport"
    matches ||--o{ opponent_requests : "optional_link"
    opponent_requests ||--o{ opponent_request_interests : "has"
    users ||--o{ opponent_request_interests : "expresses"
    users ||--o{ user_blocks : "blocker"
    users ||--o{ user_blocks : "blocked"
    users ||--o{ reports : "reporter"
    users ||--o{ reports : "reported_user"
    matches ||--o{ reports : "reported_match"
    admin_users ||--o{ reports : "reviews"
    admin_users ||--o{ admin_audit_events : "performs"
    users ||--o{ notifications : "receives"

    users {
        uuid id PK
        string firebase_uid UK
        string email UK
        string phone UK
        enum status
        timestamptz deleted_at
    }

    user_profiles {
        uuid id PK
        uuid user_id FK_UK
        enum profile_visibility
        string city
        string area
    }

    sports_connections {
        uuid id PK
        uuid requester_user_id FK
        uuid recipient_user_id FK
        enum status
        timestamptz accepted_at
    }

    teammate_requests {
        uuid id PK
        uuid creator_user_id FK
        uuid match_id FK_null
        uuid sport_id FK
        uuid team_id FK_null
        enum skill_level
        enum status
    }

    teammate_request_interests {
        uuid id PK
        uuid teammate_request_id FK
        uuid user_id FK
        enum status
    }

    opponent_requests {
        uuid id PK
        uuid creator_user_id FK
        uuid match_id FK_null
        uuid sport_id FK
        uuid team_id FK_null
        string format
        enum skill_level
        enum status
    }

    opponent_request_interests {
        uuid id PK
        uuid opponent_request_id FK
        uuid user_id FK
        enum status
    }

    matches {
        uuid id PK
        uuid host_user_id FK
        uuid sport_id FK
        uuid team_id FK_null
        uuid venue_id FK_null
        enum status
        enum visibility
        enum venue_source
        string venue_name
    }

    match_participants {
        uuid id PK
        uuid match_id FK
        uuid user_id FK
        uuid team_id FK_null
        enum status
    }

    match_invites {
        uuid id PK
        uuid match_id FK
        uuid inviter_user_id FK
        uuid invitee_user_id FK
        enum status
    }

    user_blocks {
        uuid id PK
        uuid blocker_user_id FK
        uuid blocked_user_id FK
    }

    reports {
        uuid id PK
        uuid reporter_user_id FK
        uuid reported_user_id FK_null
        uuid reported_match_id FK_null
        enum status
        uuid reviewed_by_admin_id FK_null
    }

    admin_users {
        uuid id PK
        string email UK
        enum role
    }

    notifications {
        uuid id PK
        uuid user_id FK
        enum type
        jsonb payload
    }
```

### Entity Relationship Overview (ASCII)

```
┌─────────┐     ┌──────────────┐     ┌─────────┐
│ sports  │────<│ user_sports  │>────│  users  │──┬──< sports_connections
└────┬────┘     └──────────────┘     └────┬────┘  ├──< teammate_requests ──< teammate_request_interests
     │                                    │         ├──< opponent_requests ──< opponent_request_interests
     │         ┌──────────────┐           │         ├──< user_blocks
     └────────<│   matches    │>──────────┤         ├──< reports
               └──────┬───────┘           │         ├──< match_invites
                      │                   │         └──< notifications
               ┌──────▼───────────┐  ┌────▼────┐
               │match_participants│  │user_profiles│
               └──────────────────┘  └─────────┘

admin_users ──< reports (reviewed_by)
admin_users ──< admin_audit_events
```

---

## 2. Table Definitions

### 2.1 `users` — Authentication & Account Identity

Stores account lifecycle. Links to Firebase Auth via `firebase_uid`. Profile display data lives in `user_profiles`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Internal user ID |
| `firebase_uid` | `VARCHAR(128)` | UNIQUE (partial), NULL | Firebase Auth UID; set on first bootstrap |
| `email` | `VARCHAR(255)` | UNIQUE (partial), NULL | Login email |
| `phone` | `VARCHAR(20)` | UNIQUE (partial), NULL | E.164 phone |
| `password_hash` | `VARCHAR(255)` | NULL | Legacy/password path; NULL for Firebase-only |
| `status` | `user_status` | NOT NULL, DEFAULT `PENDING_VERIFICATION` | `ACTIVE`, `SUSPENDED`, etc. |
| `email_verified_at` | `TIMESTAMPTZ` | NULL | Email verified |
| `phone_verified_at` | `TIMESTAMPTZ` | NULL | Phone verified |
| `last_login_at` | `TIMESTAMPTZ` | NULL | Last auth |
| `deleted_at` | `TIMESTAMPTZ` | NULL | Soft delete |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Audit |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Audit |

**Constraints:** `CHECK` — at least one of `email` OR `phone` non-null (when not deleted).

---

### 2.2 `user_profiles` — Public Profile & Preferences

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK | Surrogate PK |
| `user_id` | `UUID` | FK → `users.id`, UNIQUE, NOT NULL | Owner |
| `display_name` | `VARCHAR(100)` | NOT NULL | Public name |
| `avatar_url` | `VARCHAR(500)` | NULL | Photo URL |
| `bio` | `TEXT` | NULL | Short bio |
| `city` | `VARCHAR(100)` | NOT NULL | Launch city |
| `area` | `VARCHAR(100)` | NULL | Neighborhood (public) |
| `latitude` | `DECIMAL(9,6)` | NULL | Approximate lat |
| `longitude` | `DECIMAL(9,6)` | NULL | Approximate lng |
| `profile_visibility` | `profile_visibility` | NOT NULL, DEFAULT `PUBLIC` | `PUBLIC` or `CONNECTIONS_ONLY` |
| `email_notifications_enabled` | `BOOLEAN` | NOT NULL, DEFAULT `true` | MVP global toggle |
| `push_notifications_enabled` | `BOOLEAN` | NOT NULL, DEFAULT `true` | MVP global toggle |
| `timezone` | `VARCHAR(50)` | NOT NULL, DEFAULT `UTC` | IANA timezone |
| `deleted_at` | `TIMESTAMPTZ` | NULL | Soft delete |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Audit |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Audit |

**Connections-only visibility:** Full profile visible only when viewer has `ACCEPTED` row in `sports_connections` with profile owner.

---

### 2.3 `refresh_tokens` — Session Management (optional legacy)

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK → `users` |
| `token_hash` | `VARCHAR(64)` | UNIQUE, SHA-256 |
| `expires_at` | `TIMESTAMPTZ` | Expiry |
| `revoked_at` | `TIMESTAMPTZ` | NULL if active |
| `user_agent` | `VARCHAR(500)` | Client hint |
| `ip_address` | `INET` | Issuing IP |
| `created_at` | `TIMESTAMPTZ` | Issued at |

---

### 2.4 `otp_verifications` — Phone/Email OTP

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | PK |
| `identifier` | `VARCHAR(255)` | Email or phone |
| `channel` | `otp_channel` | `EMAIL` / `PHONE` |
| `purpose` | `otp_purpose` | `SIGNUP`, `LOGIN`, etc. |
| `code_hash` | `VARCHAR(64)` | Hashed OTP |
| `attempt_count` | `SMALLINT` | Failed attempts |
| `expires_at` | `TIMESTAMPTZ` | Expiry |
| `verified_at` | `TIMESTAMPTZ` | Success time |
| `created_at` | `TIMESTAMPTZ` | Created |

---

### 2.5 `sports` — Reference Data

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | PK |
| `slug` | `VARCHAR(50)` | UNIQUE — `football`, `cricket`, `badminton` |
| `name` | `VARCHAR(100)` | Display name |
| `is_active` | `BOOLEAN` | Enabled in product |
| `sort_order` | `SMALLINT` | UI order |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Audit |

---

### 2.6 `user_sports` — Sport Preferences & Skill (FR-5, FR-6)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK | Row ID |
| `user_id` | `UUID` | FK → `users`, NOT NULL | User |
| `sport_id` | `UUID` | FK → `sports`, NOT NULL | Sport |
| `skill_level` | `skill_level` | NOT NULL | `BEGINNER`, `INTERMEDIATE`, `ADVANCED` |
| `is_primary` | `BOOLEAN` | DEFAULT `false` | Primary sport |
| `deleted_at` | `TIMESTAMPTZ` | NULL | Soft delete |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Audit | |

**Unique:** `(user_id, sport_id)` WHERE `deleted_at IS NULL`.

---

### 2.7 `sports_connections` — Sports Connections (FR-12, FR-30)

Coordination links between players. **No messaging.**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK | Connection row ID |
| `requester_user_id` | `UUID` | FK → `users`, NOT NULL | Sender |
| `recipient_user_id` | `UUID` | FK → `users`, NOT NULL | Receiver |
| `status` | `sports_connection_status` | NOT NULL, DEFAULT `PENDING` | See enum |
| `accepted_at` | `TIMESTAMPTZ` | NULL | Set when `ACCEPTED` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Audit |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Audit |

**Constraints:**
- `CHECK (requester_user_id <> recipient_user_id)`
- Partial unique: `(requester_user_id, recipient_user_id)` WHERE `status IN ('PENDING', 'ACCEPTED')` — prevents duplicate active requests in same direction
- Application: reject if reverse `PENDING` exists or either party has `user_blocks` row

**Query patterns:**
- List connections for user: `WHERE (requester_user_id = $1 OR recipient_user_id = $1) AND status = 'ACCEPTED'`
- Connections-only match visibility: EXISTS accepted connection with host

---

### 2.8 `teammate_requests` — Find Teammates (FR-13)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK | Request ID |
| `creator_user_id` | `UUID` | FK → `users`, NOT NULL | Host / coordinator |
| `match_id` | `UUID` | FK → `matches`, NULL | Optional linked match |
| `sport_id` | `UUID` | FK → `sports`, NOT NULL | Sport |
| `team_id` | `UUID` | NULL | Phase 2 FK → `teams` |
| `title` | `VARCHAR(200)` | NOT NULL | Headline |
| `description` | `TEXT` | NULL | Details |
| `required_players` | `INTEGER` | NOT NULL | Slots needed |
| `skill_level` | `skill_level` | NOT NULL | Expected skill |
| `city` | `VARCHAR(100)` | NOT NULL | Discovery city |
| `area` | `VARCHAR(100)` | NULL | Discovery area |
| `status` | `teammate_request_status` | NOT NULL, DEFAULT `OPEN` | `OPEN`, `CLOSED`, `EXPIRED` |
| `expires_at` | `TIMESTAMPTZ` | NULL | Auto-expire |
| `deleted_at` | `TIMESTAMPTZ` | NULL | Soft delete |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Audit | |

---

### 2.9 `teammate_request_interests` — Teammate Interest (FR-16)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK | Interest ID |
| `teammate_request_id` | `UUID` | FK → `teammate_requests`, NOT NULL | Parent request |
| `user_id` | `UUID` | FK → `users`, NOT NULL | Interested player |
| `status` | `request_interest_status` | NOT NULL, DEFAULT `PENDING` | `PENDING`, `APPROVED`, `DECLINED` |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Audit | |

**Unique:** `(teammate_request_id, user_id)` — one interest per user per request.

---

### 2.10 `opponent_requests` — Find Opponents (FR-14, FR-17)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK | Request ID |
| `creator_user_id` | `UUID` | FK → `users`, NOT NULL | Side captain |
| `match_id` | `UUID` | FK → `matches`, NULL | Linked match after pairing |
| `sport_id` | `UUID` | FK → `sports`, NOT NULL | Sport |
| `team_id` | `UUID` | NULL | Phase 2 FK → `teams` |
| `title` | `VARCHAR(200)` | NOT NULL | Headline |
| `format` | `VARCHAR(50)` | NOT NULL | e.g. `5-a-side`, `T20` |
| `skill_level` | `skill_level` | NOT NULL | Skill band |
| `city` | `VARCHAR(100)` | NOT NULL | Venue area city |
| `area` | `VARCHAR(100)` | NULL | Venue area |
| `scheduled_starts_at` | `TIMESTAMPTZ` | NULL | Preferred window start |
| `scheduled_ends_at` | `TIMESTAMPTZ` | NULL | Preferred window end |
| `matched_request_id` | `UUID` | FK → `opponent_requests`, NULL | Paired opponent request |
| `status` | `opponent_request_status` | NOT NULL, DEFAULT `OPEN` | `OPEN`, `MATCHED`, `CLOSED`, `EXPIRED` |
| `expires_at` | `TIMESTAMPTZ` | NULL | Auto-expire |
| `deleted_at` | `TIMESTAMPTZ` | NULL | Soft delete |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Audit | |

---

### 2.11 `opponent_request_interests` — Opponent Interest (FR-16)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK | Interest ID |
| `opponent_request_id` | `UUID` | FK → `opponent_requests`, NOT NULL | Parent |
| `user_id` | `UUID` | FK → `users`, NOT NULL | Interested captain |
| `status` | `request_interest_status` | NOT NULL, DEFAULT `PENDING` | `PENDING`, `APPROVED`, `DECLINED` |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Audit | |

**Unique:** `(opponent_request_id, user_id)`.

---

### 2.12 `matches` — Scheduled Games (FR-18–FR-28)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK | Match ID |
| `host_user_id` | `UUID` | FK → `users`, NOT NULL | Host |
| `sport_id` | `UUID` | FK → `sports`, NOT NULL | Sport |
| `team_id` | `UUID` | NULL | Phase 2 host team |
| `tournament_id` | `UUID` | NULL | Phase 3–4 |
| `title` | `VARCHAR(200)` | NOT NULL | Title |
| `format` | `VARCHAR(50)` | NOT NULL | Format |
| `notes` | `TEXT` | NULL | Host notes |
| `status` | `match_status` | NOT NULL, DEFAULT `DRAFT` | Lifecycle |
| `visibility` | `match_visibility` | NOT NULL, DEFAULT `PUBLIC` | Discovery rules |
| `skill_level_expected` | `skill_level` | NOT NULL | Expected skill |
| `starts_at` | `TIMESTAMPTZ` | NOT NULL | Start (UTC) |
| `ends_at` | `TIMESTAMPTZ` | NULL | End |
| `duration_minutes` | `INTEGER` | NULL | Duration |
| `venue_name` | `VARCHAR(200)` | NOT NULL | MVP venue label |
| `venue_address` | `VARCHAR(500)` | NULL | Address text |
| `venue_id` | `UUID` | NULL | Phase 3 FK → `venues` |
| `venue_source` | `venue_source` | NOT NULL, DEFAULT `MANUAL` | `MANUAL`, `MARKETPLACE`, `PARTNER`, `VERIFIED` |
| `venue_latitude` | `DECIMAL(9,6)` | NULL | Map pin |
| `venue_longitude` | `DECIMAL(9,6)` | NULL | Map pin |
| `city` | `VARCHAR(100)` | NOT NULL | Filter city |
| `area` | `VARCHAR(100)` | NULL | Filter area |
| `max_participants` | `INTEGER` | NOT NULL | Capacity |
| `confirmed_count` | `INTEGER` | NOT NULL, DEFAULT 0 | Denormalized roster count |
| `waitlist_enabled` | `BOOLEAN` | NOT NULL, DEFAULT `false` | Waitlist on full |
| `leave_cutoff_hours` | `SMALLINT` | NOT NULL, DEFAULT 2 | Free leave cutoff |
| `hidden_from_discovery` | `BOOLEAN` | NOT NULL, DEFAULT `false` | Admin hide (FR-39) |
| `deleted_at` | `TIMESTAMPTZ` | NULL | Soft delete |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Audit | |

**`match_status`:** `DRAFT`, `OPEN`, `FULL`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.

**`match_visibility`:** `PUBLIC`, `CONNECTIONS_ONLY`, `INVITE_ONLY`.

---

### 2.13 `match_participants` — Roster & Join State (FR-21–FR-25)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK | Row ID |
| `match_id` | `UUID` | FK → `matches`, NOT NULL | Match |
| `user_id` | `UUID` | FK → `users`, NOT NULL | Participant |
| `team_id` | `UUID` | NULL | Phase 2 side/team |
| `role` | `participant_role` | NOT NULL, DEFAULT `PARTICIPANT` | `HOST`, `PARTICIPANT` |
| `status` | `participant_status` | NOT NULL | Join state |
| `removal_reason` | `TEXT` | NULL | Host removal reason |
| `approved_by_user_id` | `UUID` | FK → `users`, NULL | Approver |
| `joined_at` | `TIMESTAMPTZ` | NULL | Confirmed time |
| `left_at` | `TIMESTAMPTZ` | NULL | Leave time |
| `deleted_at` | `TIMESTAMPTZ` | NULL | Soft delete |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Audit | |

**Unique:** `(match_id, user_id)` WHERE `deleted_at IS NULL`.

---

### 2.14 `match_invites` — Direct Match Invites (FR-29)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK | Invite ID |
| `match_id` | `UUID` | FK → `matches`, NOT NULL | Match |
| `inviter_user_id` | `UUID` | FK → `users`, NOT NULL | Usually host |
| `invitee_user_id` | `UUID` | FK → `users`, NOT NULL | Invited player |
| `status` | `match_invite_status` | NOT NULL, DEFAULT `PENDING` | `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `REVOKED` |
| `message` | `TEXT` | NULL | Optional host note (not chat) |
| `expires_at` | `TIMESTAMPTZ` | NULL | Invite expiry |
| `responded_at` | `TIMESTAMPTZ` | NULL | Accept/decline time |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Audit | |

**Unique:** `(match_id, invitee_user_id)` WHERE `status = 'PENDING'`.

**Rules:** Blocked users cannot receive invites. Invite grants view access to `INVITE_ONLY` matches.

---

### 2.15 `user_blocks` — User Blocks (FR-34)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK | Block ID |
| `blocker_user_id` | `UUID` | FK → `users`, NOT NULL | Blocker |
| `blocked_user_id` | `UUID` | FK → `users`, NOT NULL | Blocked |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | When blocked |

**Unique:** `(blocker_user_id, blocked_user_id)`.

**Application rules:**
- Blocked user excluded from player discovery for blocker
- Cannot send `sports_connections` or `match_invites` either direction (enforce both ways in API)
- Cannot join same match as blocker
- Blocker's `CONNECTIONS_ONLY` matches hidden from blocked user

---

### 2.16 `reports` — Reports & Moderation (FR-33, FR-35, FR-40)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK | Report ID |
| `reporter_user_id` | `UUID` | FK → `users`, NOT NULL | Reporter |
| `reported_user_id` | `UUID` | FK → `users`, NULL | Reported user |
| `reported_match_id` | `UUID` | FK → `matches`, NULL | Reported match |
| `reason` | `report_reason` | NOT NULL | Reason code |
| `description` | `TEXT` | NULL | Free text |
| `status` | `report_status` | NOT NULL, DEFAULT `OPEN` | Queue state |
| `reviewed_by_admin_id` | `UUID` | FK → `admin_users`, NULL | Reviewing admin |
| `reviewed_at` | `TIMESTAMPTZ` | NULL | Review timestamp |
| `resolution_notes` | `TEXT` | NULL | Admin notes |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Audit | |

**Constraint:** `CHECK` — at least one of `reported_user_id` OR `reported_match_id` non-null.

---

### 2.17 `admin_users` — Admin Platform (FR-36)

Separate from consumer `users`. Staff authentication via secure login.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK | Admin ID |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | Login email |
| `password_hash` | `VARCHAR(255)` | NOT NULL | bcrypt/argon2 |
| `display_name` | `VARCHAR(100)` | NOT NULL | Staff name |
| `role` | `admin_role` | NOT NULL, DEFAULT `MODERATOR` | RBAC role |
| `status` | `admin_status` | NOT NULL, DEFAULT `ACTIVE` | `ACTIVE`, `DISABLED` |
| `last_login_at` | `TIMESTAMPTZ` | NULL | Last login |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Audit | |

---

### 2.18 `admin_audit_events` — Moderation Audit Trail (NFR-18)

Append-only log for admin actions (FR-40).

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | PK |
| `admin_user_id` | `UUID` | FK → `admin_users` |
| `action` | `VARCHAR(100)` | e.g. `USER_SUSPENDED`, `REPORT_RESOLVED` |
| `entity_type` | `VARCHAR(50)` | `USER`, `MATCH`, `REPORT` |
| `entity_id` | `UUID` | Target entity |
| `metadata` | `JSONB` | Before/after snapshot |
| `ip_address` | `INET` | Admin IP |
| `created_at` | `TIMESTAMPTZ` | Immutable timestamp |

---

### 2.19 `notifications` — In-App Notification Inbox (FR-31)

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK → `users` |
| `type` | `notification_type` | Event type |
| `title` | `VARCHAR(200)` | Short title |
| `body` | `TEXT` | Message |
| `payload` | `JSONB` | Deep-link data |
| `entity_type` | `notification_entity_type` | Related entity kind |
| `entity_id` | `UUID` | Related entity PK |
| `read_at` | `TIMESTAMPTZ` | Read timestamp |
| `deleted_at` | `TIMESTAMPTZ` | Soft delete |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Audit |

---

## 3. Relationships

| Parent | Child | Cardinality | FK | ON DELETE | Notes |
|--------|-------|-------------|-----|-----------|-------|
| `users` | `user_profiles` | 1:1 | `user_id` | RESTRICT | Created on bootstrap |
| `users` | `sports_connections` | 1:N | `requester_user_id` / `recipient_user_id` | RESTRICT | Bidirectional queries |
| `users` | `teammate_requests` | 1:N | `creator_user_id` | RESTRICT | |
| `users` | `opponent_requests` | 1:N | `creator_user_id` | RESTRICT | |
| `matches` | `teammate_requests` | 1:N | `match_id` | SET NULL | Optional link |
| `matches` | `opponent_requests` | 1:N | `match_id` | SET NULL | After pairing |
| `teammate_requests` | `teammate_request_interests` | 1:N | `teammate_request_id` | CASCADE | |
| `opponent_requests` | `opponent_request_interests` | 1:N | `opponent_request_id` | CASCADE | |
| `matches` | `match_participants` | 1:N | `match_id` | CASCADE | |
| `matches` | `match_invites` | 1:N | `match_id` | CASCADE | |
| `users` | `user_blocks` | 1:N | `blocker_user_id` | CASCADE | |
| `users` | `reports` | 1:N | `reporter_user_id` | RESTRICT | |
| `admin_users` | `reports` | 1:N | `reviewed_by_admin_id` | SET NULL | |
| `admin_users` | `admin_audit_events` | 1:N | `admin_user_id` | RESTRICT | Append-only |

### Application Rules

1. **Host auto-enrollment:** On match publish, insert `match_participants` with `role = HOST`, `status = CONFIRMED`.
2. **Capacity:** Transaction with `SELECT ... FOR UPDATE` on `matches`; update `confirmed_count`; set `FULL` when at capacity.
3. **Visibility:** Discovery queries filter `visibility = PUBLIC` OR connection EXISTS OR valid `match_invites` for viewer.
4. **Blocks:** All discovery, connection, invite, and join paths check `user_blocks` first.
5. **Lifecycle:** No join/leave when `status IN ('IN_PROGRESS', 'COMPLETED')`.
6. **Waitlist promotion:** On slot open, promote first `WAITLIST` participant → `CONFIRMED`; notify `WAITLIST_PROMOTED`.

---

## 4. Index Strategy

### 4.1 Partial Unique Indexes (Critical)

| Table | Index | Purpose |
|-------|-------|---------|
| `users` | `(email)` WHERE `deleted_at IS NULL AND email IS NOT NULL` | Unique email |
| `users` | `(phone)` WHERE `deleted_at IS NULL AND phone IS NOT NULL` | Unique phone |
| `users` | `(firebase_uid)` WHERE `deleted_at IS NULL AND firebase_uid IS NOT NULL` | Firebase lookup |
| `user_sports` | `(user_id, sport_id)` WHERE `deleted_at IS NULL` | One skill per sport |
| `sports_connections` | `(requester_user_id, recipient_user_id)` WHERE `status IN ('PENDING','ACCEPTED')` | No duplicate active requests |
| `match_participants` | `(match_id, user_id)` WHERE `deleted_at IS NULL` | No duplicate joins |
| `match_invites` | `(match_id, invitee_user_id)` WHERE `status = 'PENDING'` | One pending invite |
| `user_blocks` | `(blocker_user_id, blocked_user_id)` | UNIQUE |
| `teammate_request_interests` | `(teammate_request_id, user_id)` | UNIQUE |
| `opponent_request_interests` | `(opponent_request_id, user_id)` | UNIQUE |

### 4.2 Query-Optimized Indexes

| Table | Index | Query Pattern |
|-------|-------|---------------|
| `user_profiles` | `(city, area)` WHERE `deleted_at IS NULL` | Player discovery |
| `user_sports` | `(sport_id, skill_level)` WHERE `deleted_at IS NULL` | Find players by sport/skill |
| `sports_connections` | `(recipient_user_id, status)` | Inbound connection requests |
| `sports_connections` | `(requester_user_id, status)` | Outbound requests |
| `teammate_requests` | `(sport_id, status, city)` WHERE `deleted_at IS NULL` | Browse teammate requests |
| `opponent_requests` | `(sport_id, status, city)` WHERE `deleted_at IS NULL` | Browse opponent requests |
| `matches` | `(sport_id, status, starts_at)` WHERE `deleted_at IS NULL AND hidden_from_discovery = false` | Public discovery |
| `matches` | `(host_user_id, starts_at DESC)` | Host dashboard |
| `matches` | `(city, area, starts_at)` | Top active locations (admin) |
| `match_participants` | `(user_id, status, created_at DESC)` | My games |
| `match_invites` | `(invitee_user_id, status)` | Invite inbox |
| `user_blocks` | `(blocked_user_id)` | Reverse block lookup |
| `reports` | `(status, created_at)` WHERE `status IN ('OPEN','UNDER_REVIEW')` | Admin queue |
| `notifications` | `(user_id, created_at DESC)` | Inbox |
| `notifications` | `(user_id)` WHERE `read_at IS NULL` | Unread badge |

### 4.3 Estimated Table Sizes at 100k Users

| Table | Est. Rows |
|-------|-----------|
| `users` | 100,000 |
| `sports_connections` | ~300,000 |
| `teammate_requests` | ~50,000 |
| `opponent_requests` | ~30,000 |
| `matches` | ~200,000 |
| `match_participants` | ~2,000,000 |
| `match_invites` | ~400,000 |
| `user_blocks` | ~50,000 |
| `reports` | ~20,000 |
| `notifications` | ~5,000,000 |

---

## 5. Prisma Schema

Canonical file: [`../prisma/schema.prisma`](../prisma/schema.prisma)

The Prisma schema includes all models, enums, relations, and indexes. Partial unique indexes with `WHERE` clauses are applied via raw SQL migration (§6) because Prisma does not express them natively.

### Prisma Middleware Notes

1. **Soft delete:** Use client extension or consistent `where: { deletedAt: null }` in repositories.
2. **Partial uniques:** Enforced in SQL migration; application validates on soft-deleted re-joins.
3. **`confirmed_count`:** Update only inside `$transaction` with row lock on `matches`.
4. **Block checks:** Centralize in `BlockPolicyService` used by discovery, connections, invites, joins.

---

## 6. Migration SQL

Migrations live under `prisma/migrations/`. Below is the consolidated MVP schema migration.

### 6.1 `00001_init_extensions_enums` (excerpt)

See full file: `prisma/migrations/00001_init/migration.sql`

### 6.2 Full PostgreSQL Migration

```sql
-- GamePool MVP Schema v2.0
-- PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE user_status AS ENUM (
  'PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'
);

CREATE TYPE profile_visibility AS ENUM ('PUBLIC', 'CONNECTIONS_ONLY');

CREATE TYPE otp_channel AS ENUM ('EMAIL', 'PHONE');

CREATE TYPE otp_purpose AS ENUM (
  'SIGNUP', 'LOGIN', 'VERIFY_EMAIL', 'VERIFY_PHONE', 'PASSWORD_RESET'
);

CREATE TYPE skill_level AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

CREATE TYPE match_status AS ENUM (
  'DRAFT', 'OPEN', 'FULL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
);

CREATE TYPE match_visibility AS ENUM ('PUBLIC', 'CONNECTIONS_ONLY', 'INVITE_ONLY');

CREATE TYPE venue_source AS ENUM ('MANUAL', 'MARKETPLACE', 'PARTNER', 'VERIFIED');

CREATE TYPE participant_role AS ENUM ('HOST', 'PARTICIPANT');

CREATE TYPE participant_status AS ENUM (
  'PENDING', 'CONFIRMED', 'WAITLIST', 'DECLINED', 'REMOVED', 'LEFT'
);

CREATE TYPE sports_connection_status AS ENUM (
  'PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED'
);

CREATE TYPE teammate_request_status AS ENUM ('OPEN', 'CLOSED', 'EXPIRED');

CREATE TYPE opponent_request_status AS ENUM ('OPEN', 'MATCHED', 'CLOSED', 'EXPIRED');

CREATE TYPE request_interest_status AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

CREATE TYPE match_invite_status AS ENUM (
  'PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED'
);

CREATE TYPE report_reason AS ENUM (
  'HARASSMENT', 'NO_SHOW', 'FAKE_PROFILE', 'SPAM', 'INAPPROPRIATE_CONTENT', 'OTHER'
);

CREATE TYPE report_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN', 'MODERATOR', 'SUPPORT');

CREATE TYPE admin_status AS ENUM ('ACTIVE', 'DISABLED');

CREATE TYPE notification_type AS ENUM (
  'MATCH_JOIN_REQUEST',
  'MATCH_JOIN_APPROVED',
  'MATCH_JOIN_DECLINED',
  'MATCH_FULL',
  'MATCH_CANCELLED',
  'MATCH_REMINDER',
  'MATCH_UPDATED',
  'MATCH_STARTED',
  'MATCH_INVITE',
  'MATCH_INVITE_ACCEPTED',
  'MATCH_INVITE_DECLINED',
  'CONNECTION_REQUEST',
  'CONNECTION_ACCEPTED',
  'CONNECTION_DECLINED',
  'TEAMMATE_REQUEST_INTEREST',
  'TEAMMATE_REQUEST_APPROVED',
  'TEAMMATE_REQUEST_DECLINED',
  'OPPONENT_REQUEST_INTEREST',
  'OPPONENT_REQUEST_APPROVED',
  'OPPONENT_REQUEST_DECLINED',
  'WAITLIST_PROMOTED',
  'REPORT_STATUS_UPDATED',
  'WELCOME',
  'SYSTEM'
);

CREATE TYPE notification_entity_type AS ENUM (
  'MATCH', 'USER', 'SPORTS_CONNECTION', 'TEAMMATE_REQUEST',
  'OPPONENT_REQUEST', 'MATCH_INVITE', 'REPORT', 'SYSTEM'
);

-- ─── Core Tables ─────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid        VARCHAR(128),
  email               VARCHAR(255),
  phone               VARCHAR(20),
  password_hash       VARCHAR(255),
  status              user_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
  email_verified_at   TIMESTAMPTZ,
  phone_verified_at   TIMESTAMPTZ,
  last_login_at       TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_users_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE user_profiles (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  display_name                  VARCHAR(100) NOT NULL,
  avatar_url                    VARCHAR(500),
  bio                           TEXT,
  city                          VARCHAR(100) NOT NULL,
  area                          VARCHAR(100),
  latitude                      DECIMAL(9,6),
  longitude                     DECIMAL(9,6),
  profile_visibility            profile_visibility NOT NULL DEFAULT 'PUBLIC',
  email_notifications_enabled   BOOLEAN NOT NULL DEFAULT true,
  push_notifications_enabled    BOOLEAN NOT NULL DEFAULT true,
  timezone                      VARCHAR(50) NOT NULL DEFAULT 'UTC',
  deleted_at                    TIMESTAMPTZ,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  user_agent  VARCHAR(500),
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE otp_verifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier     VARCHAR(255) NOT NULL,
  channel        otp_channel NOT NULL,
  purpose        otp_purpose NOT NULL,
  code_hash      VARCHAR(64) NOT NULL,
  attempt_count  SMALLINT NOT NULL DEFAULT 0,
  expires_at     TIMESTAMPTZ NOT NULL,
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(50) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_sports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  sport_id     UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  skill_level  skill_level NOT NULL,
  is_primary   BOOLEAN NOT NULL DEFAULT false,
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(100) NOT NULL,
  role          admin_role NOT NULL DEFAULT 'MODERATOR',
  status        admin_status NOT NULL DEFAULT 'ACTIVE',
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  sport_id            UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  team_id             UUID,
  tournament_id       UUID,
  title               VARCHAR(200) NOT NULL,
  format              VARCHAR(50) NOT NULL,
  notes               TEXT,
  status              match_status NOT NULL DEFAULT 'DRAFT',
  visibility          match_visibility NOT NULL DEFAULT 'PUBLIC',
  skill_level_expected skill_level NOT NULL,
  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ,
  duration_minutes    INTEGER,
  venue_name          VARCHAR(200) NOT NULL,
  venue_address       VARCHAR(500),
  venue_id            UUID,
  venue_source        venue_source NOT NULL DEFAULT 'MANUAL',
  venue_latitude      DECIMAL(9,6),
  venue_longitude     DECIMAL(9,6),
  city                VARCHAR(100) NOT NULL,
  area                VARCHAR(100),
  max_participants    INTEGER NOT NULL,
  confirmed_count     INTEGER NOT NULL DEFAULT 0,
  waitlist_enabled    BOOLEAN NOT NULL DEFAULT false,
  leave_cutoff_hours  SMALLINT NOT NULL DEFAULT 2,
  hidden_from_discovery BOOLEAN NOT NULL DEFAULT false,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sports_connections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  recipient_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status              sports_connection_status NOT NULL DEFAULT 'PENDING',
  accepted_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_sports_connections_distinct CHECK (requester_user_id <> recipient_user_id)
);

CREATE TABLE teammate_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  match_id          UUID REFERENCES matches(id) ON DELETE SET NULL,
  sport_id          UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  team_id           UUID,
  title             VARCHAR(200) NOT NULL,
  description       TEXT,
  required_players  INTEGER NOT NULL,
  skill_level       skill_level NOT NULL,
  city              VARCHAR(100) NOT NULL,
  area              VARCHAR(100),
  status            teammate_request_status NOT NULL DEFAULT 'OPEN',
  expires_at        TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE teammate_request_interests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teammate_request_id   UUID NOT NULL REFERENCES teammate_requests(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status                request_interest_status NOT NULL DEFAULT 'PENDING',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teammate_request_id, user_id)
);

CREATE TABLE opponent_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  match_id              UUID REFERENCES matches(id) ON DELETE SET NULL,
  sport_id              UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  team_id               UUID,
  title                 VARCHAR(200) NOT NULL,
  format                VARCHAR(50) NOT NULL,
  skill_level           skill_level NOT NULL,
  city                  VARCHAR(100) NOT NULL,
  area                  VARCHAR(100),
  scheduled_starts_at   TIMESTAMPTZ,
  scheduled_ends_at     TIMESTAMPTZ,
  matched_request_id    UUID REFERENCES opponent_requests(id) ON DELETE SET NULL,
  status                opponent_request_status NOT NULL DEFAULT 'OPEN',
  expires_at            TIMESTAMPTZ,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE opponent_request_interests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opponent_request_id   UUID NOT NULL REFERENCES opponent_requests(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status                request_interest_status NOT NULL DEFAULT 'PENDING',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (opponent_request_id, user_id)
);

CREATE TABLE match_participants (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id              UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  team_id               UUID,
  role                  participant_role NOT NULL DEFAULT 'PARTICIPANT',
  status                participant_status NOT NULL,
  removal_reason        TEXT,
  approved_by_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at             TIMESTAMPTZ,
  left_at               TIMESTAMPTZ,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE match_invites (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id          UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  inviter_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  invitee_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status            match_invite_status NOT NULL DEFAULT 'PENDING',
  message           TEXT,
  expires_at        TIMESTAMPTZ,
  responded_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_blocks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_user_id, blocked_user_id),
  CONSTRAINT chk_user_blocks_distinct CHECK (blocker_user_id <> blocked_user_id)
);

CREATE TABLE reports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reported_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_match_id     UUID REFERENCES matches(id) ON DELETE SET NULL,
  reason                report_reason NOT NULL,
  description           TEXT,
  status                report_status NOT NULL DEFAULT 'OPEN',
  reviewed_by_admin_id  UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at           TIMESTAMPTZ,
  resolution_notes      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_reports_target CHECK (
    reported_user_id IS NOT NULL OR reported_match_id IS NOT NULL
  )
);

CREATE TABLE admin_audit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id   UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  action          VARCHAR(100) NOT NULL,
  entity_type     VARCHAR(50) NOT NULL,
  entity_id       UUID NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  entity_type notification_entity_type,
  entity_id   UUID,
  read_at     TIMESTAMPTZ,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Partial Unique Indexes ────────────────────────────────────────────────────

CREATE UNIQUE INDEX uq_users_email_active
  ON users (email) WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE UNIQUE INDEX uq_users_phone_active
  ON users (phone) WHERE deleted_at IS NULL AND phone IS NOT NULL;

CREATE UNIQUE INDEX uq_users_firebase_uid_active
  ON users (firebase_uid) WHERE deleted_at IS NULL AND firebase_uid IS NOT NULL;

CREATE UNIQUE INDEX uq_user_sports_active
  ON user_sports (user_id, sport_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_sports_connections_active_pair
  ON sports_connections (requester_user_id, recipient_user_id)
  WHERE status IN ('PENDING', 'ACCEPTED');

CREATE UNIQUE INDEX uq_match_participants_active
  ON match_participants (match_id, user_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_match_invites_pending
  ON match_invites (match_id, invitee_user_id) WHERE status = 'PENDING';

-- ─── Query Indexes ─────────────────────────────────────────────────────────────

CREATE INDEX idx_users_status ON users (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_profiles_location ON user_profiles (city, area) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_sports_sport_skill ON user_sports (sport_id, skill_level) WHERE deleted_at IS NULL;
CREATE INDEX idx_sports_connections_recipient ON sports_connections (recipient_user_id, status);
CREATE INDEX idx_sports_connections_requester ON sports_connections (requester_user_id, status);
CREATE INDEX idx_teammate_requests_discovery ON teammate_requests (sport_id, status, city) WHERE deleted_at IS NULL;
CREATE INDEX idx_opponent_requests_discovery ON opponent_requests (sport_id, status, city) WHERE deleted_at IS NULL;
CREATE INDEX idx_matches_discovery ON matches (sport_id, status, starts_at)
  WHERE deleted_at IS NULL AND hidden_from_discovery = false;
CREATE INDEX idx_matches_host ON matches (host_user_id, starts_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_matches_location ON matches (city, area, starts_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_match_participants_user ON match_participants (user_id, status, created_at DESC);
CREATE INDEX idx_match_invites_invitee ON match_invites (invitee_user_id, status);
CREATE INDEX idx_user_blocks_blocked ON user_blocks (blocked_user_id);
CREATE INDEX idx_reports_queue ON reports (status, created_at)
  WHERE status IN ('OPEN', 'UNDER_REVIEW');
CREATE INDEX idx_notifications_inbox ON notifications (user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE read_at IS NULL AND deleted_at IS NULL;
CREATE INDEX idx_admin_audit_admin ON admin_audit_events (admin_user_id, created_at DESC);

-- ─── Seed ──────────────────────────────────────────────────────────────────────

INSERT INTO sports (slug, name, sort_order) VALUES
  ('football', 'Football', 1),
  ('cricket', 'Cricket', 2),
  ('badminton', 'Badminton', 3)
ON CONFLICT (slug) DO NOTHING;
```

### 6.3 Upgrade from v1.0 (`00002_mvp_coordination`)

For existing v1.0 deployments, apply incremental migration adding new enums/tables and altering `matches`, `user_sports`, `notifications`. See `prisma/migrations/00002_mvp_coordination/migration.sql`.

---

## 7. Future Scalability Notes

### 7.1 Phase 2 Tables (design now, migrate later)

| Table | Purpose | Extension from MVP |
|-------|---------|-------------------|
| `teams` | Team entities | FK from `team_id` on matches, participants, requests |
| `team_members` | Roster | `user_id`, `team_id`, `role` |
| `activities` / `activity_instances` | Sports Activities (FR-44–47) | Mirror `matches` participant pattern |
| `match_chat_rooms` | Phase 2 chat | `match_id` UNIQUE; messages table separate |
| `user_availability` | US-A4 windows | `user_id`, `day_of_week`, times |
| `notification_deliveries` | Push/email audit | FK → `notifications` |

### 7.2 Phase 3+ Tables

| Table | Purpose |
|-------|---------|
| `venues` | Venue catalog; `matches.venue_id` FK |
| `venue_slots` / `bookings` | Turf booking |
| `tournaments` / `tournament_fixtures` | `matches.tournament_id` |
| `payments` / `wallets` / `subscriptions` | Monetization |
| `ad_campaigns` / `featured_listings` | Ads |
| `cities` | Multi-city reference |

### 7.3 Admin Dashboard Metrics (FR-37) — Query Hints

| Metric | SQL approach |
|--------|--------------|
| New Users Today | `COUNT(*) FROM users WHERE created_at >= CURRENT_DATE` |
| Active Matches | `COUNT(*) FROM matches WHERE status IN ('OPEN','FULL','IN_PROGRESS')` |
| Pending Reports | `COUNT(*) FROM reports WHERE status IN ('OPEN','UNDER_REVIEW')` |
| WAP | Distinct `user_id` from `match_participants` joined in last 7 days with `CONFIRMED` + hosts |
| Match Fill Rate | `confirmed_count / max_participants` avg over 7 days for completed/open matches |
| Sports Distribution | `GROUP BY sport_id` on `matches` |
| Top Active Locations | `GROUP BY city, area` on `matches` + `user_profiles` |

Consider materialized views refreshed hourly at scale.

### 7.4 Notifications at Scale

Partition `notifications` by month on `created_at`. Archive read notifications > 90 days. Unread counts in Redis or `user_notification_stats` summary table.

### 7.5 Match Join Hot Path

```sql
BEGIN;
SELECT id, confirmed_count, max_participants, status
  FROM matches WHERE id = $1 AND deleted_at IS NULL FOR UPDATE;
-- check blocks, visibility, capacity
INSERT INTO match_participants (...) VALUES (...);
UPDATE matches SET confirmed_count = confirmed_count + 1,
  status = CASE WHEN confirmed_count + 1 >= max_participants THEN 'FULL' ELSE status END
  WHERE id = $1;
COMMIT;
```

### 7.6 Connection Discovery Query (Connections Only Matches)

```sql
SELECT m.*
FROM matches m
WHERE m.visibility = 'CONNECTIONS_ONLY'
  AND m.deleted_at IS NULL
  AND m.hidden_from_discovery = false
  AND EXISTS (
    SELECT 1 FROM sports_connections sc
    WHERE sc.status = 'ACCEPTED'
      AND (
        (sc.requester_user_id = m.host_user_id AND sc.recipient_user_id = $viewer_id)
        OR (sc.recipient_user_id = m.host_user_id AND sc.requester_user_id = $viewer_id)
      )
  );
```

### 7.7 Permanent Non-Goals (No Tables)

No tables for: followers, feeds, posts, reactions, personal messages, WhatsApp integrations, contact sharing.

---

## Appendix A: Enum Reference

### `skill_level`
`BEGINNER` | `INTERMEDIATE` | `ADVANCED`

### `match_status`
`DRAFT` | `OPEN` | `FULL` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED`

### `match_visibility`
`PUBLIC` | `CONNECTIONS_ONLY` | `INVITE_ONLY`

### `sports_connection_status`
`PENDING` | `ACCEPTED` | `DECLINED` | `BLOCKED`

### `notification_type` (MVP)
Includes: `CONNECTION_*`, `TEAMMATE_*`, `OPPONENT_*`, `WAITLIST_PROMOTED`, `REPORT_STATUS_UPDATED`, `MATCH_*`, `MATCH_INVITE*`, `MATCH_STARTED`

---

## Appendix B: PRD Traceability

| PRD Area | Tables |
|----------|--------|
| Auth & Profile | `users`, `user_profiles`, `user_sports` |
| Find Players | `user_profiles`, `user_sports`, `user_blocks` |
| Sports Connections | `sports_connections` |
| Find Teammates | `teammate_requests`, `teammate_request_interests` |
| Find Opponents | `opponent_requests`, `opponent_request_interests` |
| Matches | `matches`, `match_participants`, `match_invites`, `match_join_requests` |
| Availability | `user_availability` |
| Notifications | `notifications` |
| Safety | `user_blocks`, `reports` |
| Admin | `admin_users`, `admin_audit_events`, `reports` |

---

## Schema Supplement v2.1 (2026-06-23)

Incremental changes applied in `prisma/migrations/00003_schema_supplement/`:

| Change | Detail |
|--------|--------|
| `skill_level` | Added `PROFESSIONAL` |
| `match_join_requests` | Host-approval join workflow; partial unique on pending `(match_id, user_id)` |
| `user_availability` | Weekly windows: `day_of_week`, `start_time`, `end_time` |
| `sports` | Added `icon_url`, `color` |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-23 | Engineering | Initial MVP schema (9 tables) |
| 2.0 | 2026-06-23 | Engineering | Full PRD v2.1 alignment: connections, teammate/opponent requests, blocks, reports, invites, admin, lifecycle, visibility, venue-ready, notifications |
| 2.1 | 2026-06-23 | Engineering | PROFESSIONAL skill; `match_join_requests`; `user_availability`; sports `icon_url`/`color` |
