-- V6: Directory, Extended Availability, Equipment, Favorites

-- 1. Expand availability_status on profiles (drop old check, add new)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_availability_status_check;
ALTER TABLE profiles ALTER COLUMN availability_status SET DEFAULT 'available';
ALTER TABLE profiles ADD CONSTRAINT profiles_availability_status_check
  CHECK (availability_status = ANY (ARRAY[
    'available','limited','unavailable',
    'busy','on_leave','vacation','offline',
    'full_capacity','closed','maintenance'
  ]));

-- 2. Add extra columns to profiles for directory
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city          TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio           TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_exp     INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS services      TEXT[];   -- e.g. {'MRI','CT','X-Ray'}
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS working_hours TEXT;     -- e.g. 'Sun-Thu 8am-5pm'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating        NUMERIC(3,2) DEFAULT 0;

-- 3. Equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,  -- MRI, CT, X-Ray, Ultrasound, Echo, Endoscopy
  status      TEXT NOT NULL DEFAULT 'available'
              CHECK (status IN ('available','busy','out_of_service','maintenance')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_equipment_owner ON equipment(owner_id);

-- 4. Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

-- 5. Updated_at triggers
CREATE OR REPLACE TRIGGER trg_equipment_updated_at
  BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
