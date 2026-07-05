-- ============================================================
-- MediLink V1 — Initial Schema
-- ============================================================

-- Enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'PRACTITIONER', 'LAB_STAFF', 'PATIENT');

CREATE TYPE practitioner_specialty AS ENUM (
    'GENERAL_PRACTICE', 'INTERNAL_MEDICINE', 'CARDIOLOGY', 'NEUROLOGY',
    'ORTHOPEDICS', 'PEDIATRICS', 'OBSTETRICS_GYNECOLOGY', 'DERMATOLOGY',
    'PSYCHIATRY', 'RADIOLOGY', 'PATHOLOGY', 'SURGERY', 'ONCOLOGY',
    'ENDOCRINOLOGY', 'GASTROENTEROLOGY', 'PULMONOLOGY', 'NEPHROLOGY',
    'UROLOGY', 'OPHTHALMOLOGY', 'ENT', 'OTHER'
);

CREATE TYPE affiliation_role AS ENUM ('PRIMARY', 'VISITING', 'CONSULTING', 'ON_CALL');

CREATE TYPE referral_status AS ENUM (
    'DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED',
    'EXPIRED', 'REDIRECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
);

CREATE TYPE referral_event_type AS ENUM (
    'CREATED', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED',
    'EXPIRED', 'REDIRECTED', 'STARTED', 'COMPLETED', 'CANCELLED',
    'NOTE_ADDED', 'ATTACHMENT_ADDED'
);

CREATE TYPE urgency_level AS ENUM ('ROUTINE', 'URGENT', 'EMERGENCY');

-- ============================================================
-- users
-- ============================================================
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    role          user_role    NOT NULL,
    phone         VARCHAR(30),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);

-- ============================================================
-- medical_centers
-- ============================================================
CREATE TABLE medical_centers (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL,
    type       VARCHAR(100),                    -- hospital, clinic, polyclinic, etc.
    address    TEXT,
    city       VARCHAR(100),
    phone      VARCHAR(30),
    email      VARCHAR(255),
    is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- practitioners
-- ============================================================
CREATE TABLE practitioners (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID                  NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    specialty       practitioner_specialty NOT NULL,
    license_number  VARCHAR(100)          NOT NULL UNIQUE,
    bio             TEXT,
    accepts_referrals BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_practitioners_user_id ON practitioners (user_id);
CREATE INDEX idx_practitioners_specialty ON practitioners (specialty);

-- ============================================================
-- affiliations  (practitioner ↔ medical_center, many-to-many with extras)
-- ============================================================
CREATE TABLE affiliations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id   UUID             NOT NULL REFERENCES practitioners (id) ON DELETE CASCADE,
    medical_center_id UUID             NOT NULL REFERENCES medical_centers (id) ON DELETE CASCADE,
    role              affiliation_role NOT NULL DEFAULT 'PRIMARY',
    is_primary        BOOLEAN         NOT NULL DEFAULT FALSE,
    active_from       DATE            NOT NULL DEFAULT CURRENT_DATE,
    active_to         DATE,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_affiliation UNIQUE (practitioner_id, medical_center_id, role)
);

CREATE INDEX idx_affiliations_practitioner ON affiliations (practitioner_id);
CREATE INDEX idx_affiliations_center       ON affiliations (medical_center_id);

-- ============================================================
-- laboratories
-- ============================================================
CREATE TABLE laboratories (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_center_id UUID        REFERENCES medical_centers (id) ON DELETE SET NULL,
    name              VARCHAR(255) NOT NULL,
    accreditation_no  VARCHAR(100),
    phone             VARCHAR(30),
    email             VARCHAR(255),
    is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- patients
-- ============================================================
CREATE TABLE patients (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         REFERENCES users (id) ON DELETE SET NULL,  -- optional portal access
    full_name     VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender        VARCHAR(20),
    national_id   VARCHAR(50)  UNIQUE,
    phone         VARCHAR(30),
    email         VARCHAR(255),
    blood_type    VARCHAR(5),
    allergies     TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_national_id ON patients (national_id);
CREATE INDEX idx_patients_user_id     ON patients (user_id);

-- ============================================================
-- referrals
-- ============================================================
CREATE TABLE referrals (
    id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id            UUID           NOT NULL REFERENCES patients (id),
    referring_practitioner_id  UUID      NOT NULL REFERENCES practitioners (id),
    receiving_practitioner_id  UUID      REFERENCES practitioners (id),   -- NULL = open referral
    referring_center_id   UUID           REFERENCES medical_centers (id),
    receiving_center_id   UUID           REFERENCES medical_centers (id),

    status                referral_status NOT NULL DEFAULT 'DRAFT',
    urgency               urgency_level   NOT NULL DEFAULT 'ROUTINE',

    reason                TEXT           NOT NULL,
    clinical_notes        TEXT,
    diagnosis_code        VARCHAR(20),   -- ICD-10
    requested_specialty   practitioner_specialty,

    sent_at               TIMESTAMPTZ,
    viewed_at             TIMESTAMPTZ,
    responded_at          TIMESTAMPTZ,
    completed_at          TIMESTAMPTZ,
    expires_at            TIMESTAMPTZ,

    -- if redirected, points to the follow-up referral
    redirected_to_id      UUID           REFERENCES referrals (id),

    created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referrals_patient          ON referrals (patient_id);
CREATE INDEX idx_referrals_referring        ON referrals (referring_practitioner_id);
CREATE INDEX idx_referrals_receiving        ON referrals (receiving_practitioner_id);
CREATE INDEX idx_referrals_status           ON referrals (status);
CREATE INDEX idx_referrals_created_at       ON referrals (created_at DESC);

-- ============================================================
-- referral_events  (immutable audit log)
-- ============================================================
CREATE TABLE referral_events (
    id           UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id  UUID               NOT NULL REFERENCES referrals (id) ON DELETE CASCADE,
    event_type   referral_event_type NOT NULL,
    actor_id     UUID               REFERENCES users (id) ON DELETE SET NULL,
    payload      JSONB,             -- flexible extras (note text, redirect target, etc.)
    occurred_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_events_referral    ON referral_events (referral_id);
CREATE INDEX idx_referral_events_occurred_at ON referral_events (occurred_at DESC);

-- ============================================================
-- attachments
-- ============================================================
CREATE TABLE attachments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id  UUID         NOT NULL REFERENCES referrals (id) ON DELETE CASCADE,
    uploaded_by  UUID         REFERENCES users (id) ON DELETE SET NULL,
    file_name    VARCHAR(255) NOT NULL,
    content_type VARCHAR(127) NOT NULL,
    size_bytes   BIGINT       NOT NULL,
    storage_key  VARCHAR(500) NOT NULL,  -- S3 key or local path
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_referral ON attachments (referral_id);

-- ============================================================
-- updated_at auto-update trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at          BEFORE UPDATE ON users           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_medical_centers_updated_at BEFORE UPDATE ON medical_centers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_practitioners_updated_at  BEFORE UPDATE ON practitioners   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_laboratories_updated_at   BEFORE UPDATE ON laboratories    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_patients_updated_at       BEFORE UPDATE ON patients        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_referrals_updated_at      BEFORE UPDATE ON referrals       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
