-- Optional skill level on matches (null = any skill welcome)
ALTER TABLE matches ALTER COLUMN skill_level_expected DROP NOT NULL;

CREATE TABLE match_chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_chat_messages_match_created
  ON match_chat_messages(match_id, created_at);
