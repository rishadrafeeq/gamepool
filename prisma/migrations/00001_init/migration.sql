-- GamePool MVP Schema v2.0 — Initial migration
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

CREATE TABLE matches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  sport_id              UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  team_id               UUID,
  tournament_id         UUID,
  title                 VARCHAR(200) NOT NULL,
  format                VARCHAR(50) NOT NULL,
  notes                 TEXT,
  status                match_status NOT NULL DEFAULT 'DRAFT',
  visibility            match_visibility NOT NULL DEFAULT 'PUBLIC',
  skill_level_expected  skill_level NOT NULL,
  starts_at             TIMESTAMPTZ NOT NULL,
  ends_at               TIMESTAMPTZ,
  duration_minutes      INTEGER,
  venue_name            VARCHAR(200) NOT NULL,
  venue_address         VARCHAR(500),
  venue_id              UUID,
  venue_source          venue_source NOT NULL DEFAULT 'MANUAL',
  venue_latitude        DECIMAL(9,6),
  venue_longitude       DECIMAL(9,6),
  city                  VARCHAR(100) NOT NULL,
  area                  VARCHAR(100),
  max_participants      INTEGER NOT NULL,
  confirmed_count       INTEGER NOT NULL DEFAULT 0,
  waitlist_enabled      BOOLEAN NOT NULL DEFAULT false,
  leave_cutoff_hours    SMALLINT NOT NULL DEFAULT 2,
  hidden_from_discovery BOOLEAN NOT NULL DEFAULT false,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
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
CREATE INDEX idx_match_participants_match_status ON match_participants (match_id, status);
CREATE INDEX idx_match_participants_user ON match_participants (user_id, status, created_at DESC);
CREATE INDEX idx_match_invites_invitee ON match_invites (invitee_user_id, status);
CREATE INDEX idx_user_blocks_blocked ON user_blocks (blocked_user_id);
CREATE INDEX idx_reports_queue ON reports (status, created_at)
  WHERE status IN ('OPEN', 'UNDER_REVIEW');
CREATE INDEX idx_notifications_inbox ON notifications (user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE read_at IS NULL AND deleted_at IS NULL;
CREATE INDEX idx_admin_audit_admin ON admin_audit_events (admin_user_id, created_at DESC);
CREATE INDEX idx_otp_identifier_purpose ON otp_verifications (identifier, purpose, created_at DESC);
CREATE INDEX idx_refresh_tokens_user_expires ON refresh_tokens (user_id, expires_at);

-- ─── Seed ──────────────────────────────────────────────────────────────────────

INSERT INTO sports (slug, name, sort_order) VALUES
  ('football', 'Football', 1),
  ('cricket', 'Cricket', 2),
  ('badminton', 'Badminton', 3)
ON CONFLICT (slug) DO NOTHING;
