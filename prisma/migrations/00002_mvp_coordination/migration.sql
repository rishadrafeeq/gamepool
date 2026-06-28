-- GamePool v1.0 → v2.0 upgrade migration (idempotent)
-- Greenfield: 00001_init already includes the full v2.0 schema.
-- This migration only applies safe, idempotent changes for legacy upgrades.

-- ─── Enum value extensions (no-op if already present) ───────────────────────

ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS' BEFORE 'COMPLETED';

ALTER TYPE match_visibility ADD VALUE IF NOT EXISTS 'CONNECTIONS_ONLY' BEFORE 'INVITE_ONLY';

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

-- ─── Column extensions (no-op if already present) ───────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128);

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS team_id UUID,
  ADD COLUMN IF NOT EXISTS tournament_id UUID,
  ADD COLUMN IF NOT EXISTS venue_id UUID,
  ADD COLUMN IF NOT EXISTS venue_source venue_source NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS hidden_from_discovery BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS team_id UUID;

-- ─── Indexes (idempotent) ───────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_firebase_uid_active
  ON users (firebase_uid) WHERE deleted_at IS NULL AND firebase_uid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sports_connections_active_pair
  ON sports_connections (requester_user_id, recipient_user_id)
  WHERE status IN ('PENDING', 'ACCEPTED');

CREATE UNIQUE INDEX IF NOT EXISTS uq_match_invites_pending
  ON match_invites (match_id, invitee_user_id) WHERE status = 'PENDING';
