-- V8: Doctor schedules at centers + cancelled affiliation status

-- Allow cancellation of accepted affiliations
ALTER TABLE doctor_invitations DROP CONSTRAINT IF EXISTS doctor_invitations_status_check;
ALTER TABLE doctor_invitations ADD CONSTRAINT doctor_invitations_status_check
  CHECK (status IN ('pending','accepted','rejected','cancelled'));

-- Doctor working schedule at a specific center
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_center ON doctor_schedules(center_id);
CREATE INDEX IF NOT EXISTS idx_schedules_doctor ON doctor_schedules(doctor_id);
