-- GamePool Schema Supplement v2.1
-- PROFESSIONAL skill level, match_join_requests, user_availability, sports branding

-- ─── skill_level: add PROFESSIONAL ───────────────────────────────────────────

ALTER TYPE skill_level ADD VALUE IF NOT EXISTS 'PROFESSIONAL';

-- ─── New enums ─────────────────────────────────────────────────────────────────

CREATE TYPE day_of_week AS ENUM (
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
);

CREATE TYPE match_join_request_status AS ENUM (
  'PENDING', 'APPROVED', 'DECLINED', 'CANCELLED'
);

-- ─── sports: branding columns ────────────────────────────────────────────────

ALTER TABLE sports
  ADD COLUMN IF NOT EXISTS icon_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS color VARCHAR(20);

UPDATE sports SET
  icon_url = COALESCE(icon_url, '/icons/' || slug || '.svg'),
  color = COALESCE(color, CASE slug
    WHEN 'football' THEN '#16A34A'
    WHEN 'cricket' THEN '#2563EB'
    WHEN 'badminton' THEN '#DC2626'
    ELSE '#6B7280'
  END)
WHERE slug IN ('football', 'cricket', 'badminton');

-- ─── user_availability ───────────────────────────────────────────────────────

CREATE TABLE user_availability (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week  day_of_week NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_user_availability_time CHECK (start_time < end_time),
  UNIQUE (user_id, day_of_week, start_time, end_time)
);

CREATE INDEX idx_user_availability_user ON user_availability (user_id);

-- ─── match_join_requests ─────────────────────────────────────────────────────

CREATE TABLE match_join_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id            UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status              match_join_request_status NOT NULL DEFAULT 'PENDING',
  message             TEXT,
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_match_join_requests_pending
  ON match_join_requests (match_id, user_id)
  WHERE status = 'PENDING';

CREATE INDEX idx_match_join_requests_match_status
  ON match_join_requests (match_id, status);

CREATE INDEX idx_match_join_requests_user
  ON match_join_requests (user_id, status, created_at DESC);
