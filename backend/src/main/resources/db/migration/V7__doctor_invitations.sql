-- V7: Doctor invitations from centers
CREATE TABLE IF NOT EXISTS doctor_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','rejected')),
  message     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (center_id, doctor_id)
);

CREATE INDEX IF NOT EXISTS idx_invitations_doctor ON doctor_invitations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_invitations_center ON doctor_invitations(center_id);

CREATE OR REPLACE TRIGGER trg_invitations_updated_at
  BEFORE UPDATE ON doctor_invitations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
