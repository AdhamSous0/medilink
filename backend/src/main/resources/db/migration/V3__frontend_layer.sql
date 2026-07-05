-- ============================================================
-- V3 — Frontend-Compatible Layer
-- Adds profiles, extends referrals, adds supporting tables
-- ============================================================

-- 1. New user role values for frontend
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'DOCTOR';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'MEDICAL_CENTER';

-- 2. Make old NOT NULL FKs nullable (frontend doesn't know about practitioners table)
ALTER TABLE referrals ALTER COLUMN patient_id DROP NOT NULL;
ALTER TABLE referrals ALTER COLUMN referring_practitioner_id DROP NOT NULL;

-- 3. Add frontend-compatible columns to referrals
ALTER TABLE referrals
    ADD COLUMN IF NOT EXISTS doctor_id        UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS center_id        UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS patient_name     TEXT,
    ADD COLUMN IF NOT EXISTS patient_phone    TEXT,
    ADD COLUMN IF NOT EXISTS patient_dob      DATE,
    ADD COLUMN IF NOT EXISTS specialty_needed TEXT,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS app_status       TEXT NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_referrals_doctor_id ON referrals(doctor_id);
CREATE INDEX IF NOT EXISTS idx_referrals_center_id ON referrals(center_id);
CREATE INDEX IF NOT EXISTS idx_referrals_app_status ON referrals(app_status);

-- 4. profiles (extended user info matched to frontend schema)
CREATE TABLE IF NOT EXISTS profiles (
    id                UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name         TEXT,
    email             TEXT,
    phone             TEXT,
    specialty         TEXT,
    license_number    TEXT,
    date_of_birth     DATE,
    organization_name TEXT,
    provider_type     TEXT CHECK (
        provider_type IN ('clinic','medical_center','laboratory','radiology_center')
    ),
    address           TEXT,
    avatar_url        TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. appointments
CREATE TABLE IF NOT EXISTS appointments (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id      UUID        NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    scheduled_at     TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER     NOT NULL DEFAULT 30,
    location         TEXT,
    notes            TEXT,
    created_by       UUID        REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_referral ON appointments(referral_id);

-- 6. referral_messages
CREATE TABLE IF NOT EXISTS referral_messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID        NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    sender_id   UUID        NOT NULL REFERENCES users(id),
    body        TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_referral ON referral_messages(referral_id);

-- 7. reports
CREATE TABLE IF NOT EXISTS reports (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id  UUID        NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    uploaded_by  UUID        REFERENCES users(id),
    title        TEXT        NOT NULL,
    summary      TEXT,
    storage_path TEXT,
    mime_type    TEXT,
    size_bytes   BIGINT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_referral ON reports(referral_id);

-- 8. referral_attachments
CREATE TABLE IF NOT EXISTS referral_attachments (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id  UUID        NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    uploaded_by  UUID        REFERENCES users(id),
    label        TEXT,
    storage_path TEXT        NOT NULL DEFAULT '',
    mime_type    TEXT,
    size_bytes   BIGINT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attachments_referral ON referral_attachments(referral_id);

-- 9. notifications
CREATE TABLE IF NOT EXISTS notifications (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT        NOT NULL DEFAULT 'generic',
    title      TEXT        NOT NULL,
    message    TEXT,
    link       TEXT,
    read       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
