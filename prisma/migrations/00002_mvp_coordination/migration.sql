-- GamePool v1.0 → v2.0 upgrade migration
-- Apply only if 00001_init was the original 9-table schema.
-- For greenfield deployments, use 00001_init only.

-- ─── Enum updates ──────────────────────────────────────────────────────────────

-- skill_level: remove OPEN if present (migrate OPEN → INTERMEDIATE)
DO $$ BEGIN
  ALTER TYPE skill_level RENAME TO skill_level_old;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE TYPE skill_level AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- match_status: add IN_PROGRESS
ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS' BEFORE 'COMPLETED';

-- match_visibility: add CONNECTIONS_ONLY
ALTER TYPE match_visibility ADD VALUE IF NOT EXISTS 'CONNECTIONS_ONLY' BEFORE 'INVITE_ONLY';

CREATE TYPE venue_source AS ENUM ('MANUAL', 'MARKETPLACE', 'PARTNER', 'VERIFIED');

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

-- Extend notification_type (PostgreSQL: add values individually)
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'MATCH_STARTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'MATCH_INVITE';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'MATCH_INVITE_ACCEPTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'MATCH_INVITE_DECLINED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'CONNECTION_REQUEST';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'CONNECTION_ACCEPTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'CONNECTION_DECLINED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'TEAMMATE_REQUEST_INTEREST';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'TEAMMATE_REQUEST_APPROVED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'TEAMMATE_REQUEST_DECLINED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'OPPONENT_REQUEST_INTEREST';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'OPPONENT_REQUEST_APPROVED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'OPPONENT_REQUEST_DECLINED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'WAITLIST_PROMOTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'REPORT_STATUS_UPDATED';

ALTER TYPE notification_entity_type ADD VALUE IF NOT EXISTS 'SPORTS_CONNECTION';
ALTER TYPE notification_entity_type ADD VALUE IF NOT EXISTS 'TEAMMATE_REQUEST';
ALTER TYPE notification_entity_type ADD VALUE IF NOT EXISTS 'OPPONENT_REQUEST';
ALTER TYPE notification_entity_type ADD VALUE IF NOT EXISTS 'MATCH_INVITE';
ALTER TYPE notification_entity_type ADD VALUE IF NOT EXISTS 'REPORT';

-- ─── Alter existing tables ─────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128);

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS team_id UUID,
  ADD COLUMN IF NOT EXISTS tournament_id UUID,
  ADD COLUMN IF NOT EXISTS venue_id UUID,
  ADD COLUMN IF NOT EXISTS venue_source venue_source NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS hidden_from_discovery BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS team_id UUID;

-- ─── New tables (idempotent) ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_users (
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

-- sports_connections, teammate_requests, opponent_requests, match_invites,
-- user_blocks, reports, admin_audit_events — same DDL as 00001_init

-- ─── Indexes (idempotent) ──────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_firebase_uid_active
  ON users (firebase_uid) WHERE deleted_at IS NULL AND firebase_uid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sports_connections_active_pair
  ON sports_connections (requester_user_id, recipient_user_id)
  WHERE status IN ('PENDING', 'ACCEPTED');

CREATE UNIQUE INDEX IF NOT EXISTS uq_match_invites_pending
  ON match_invites (match_id, invitee_user_id) WHERE status = 'PENDING';
