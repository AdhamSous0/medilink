-- ============================================================
-- V2 — Extend referral_status, rename column, rebuild affiliations,
--       add redirect_referral function
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extend referral_status enum
--    PostgreSQL cannot rename enum values, so we ADD new ones.
--    DECLINED is kept (deprecated); use REJECTED going forward.
-- ------------------------------------------------------------
ALTER TYPE referral_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE referral_status ADD VALUE IF NOT EXISTS 'rejected';

-- referral_event_type needs matching values
ALTER TYPE referral_event_type ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE referral_event_type ADD VALUE IF NOT EXISTS 'rejected';

-- ------------------------------------------------------------
-- 2. Rename redirected_to_id → redirected_to_referral_id
-- ------------------------------------------------------------
ALTER TABLE referrals
    RENAME COLUMN redirected_to_id TO redirected_to_referral_id;

-- ------------------------------------------------------------
-- 3. Rebuild affiliations
--    Old design: practitioner_id → practitioners, medical_center_id → medical_centers
--    New design: practitioner_user_id → users, medical_center_id → medical_centers
--    Note: medical centers are NOT users in this schema, so we keep FK to medical_centers.
--          The "auth.users" in the spec is mapped to our public.users table.
-- ------------------------------------------------------------
DROP TABLE IF EXISTS affiliations;

CREATE TABLE affiliations (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_user_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    medical_center_id     UUID NOT NULL REFERENCES medical_centers (id) ON DELETE CASCADE,
    status                TEXT NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'inactive')),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_affiliation UNIQUE (practitioner_user_id, medical_center_id)
);

CREATE INDEX idx_affiliations_practitioner_user ON affiliations (practitioner_user_id);
CREATE INDEX idx_affiliations_center            ON affiliations (medical_center_id);

-- RLS: each DB transaction sets app.current_user_id via Spring aspect
ALTER TABLE affiliations ENABLE ROW LEVEL SECURITY;

-- Practitioners see only their own affiliations
CREATE POLICY affil_practitioner_select ON affiliations
    FOR SELECT
    USING (practitioner_user_id = current_setting('app.current_user_id', true)::uuid);

-- Medical center admin column: add managed_by_user_id to medical_centers so RLS can check ownership
ALTER TABLE medical_centers
    ADD COLUMN IF NOT EXISTS managed_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL;

-- Center admins see & manage affiliations of their own center
CREATE POLICY affil_center_admin_all ON affiliations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM medical_centers mc
            WHERE mc.id = affiliations.medical_center_id
              AND mc.managed_by_user_id = current_setting('app.current_user_id', true)::uuid
        )
    );

-- ------------------------------------------------------------
-- 4. redirect_referral(old_referral_id, new_center_id, new_doctor_user_id)
--    • Marks old referral as REDIRECTED
--    • Creates new referral (SENT) with same patient/reason but new provider
--    • Links them via redirected_to_referral_id
--    Returns the new referral id.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION redirect_referral(
    p_referral_id       UUID,
    p_new_center_id     UUID,
    p_new_doctor_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_old         referrals%ROWTYPE;
    v_new_doctor  UUID;   -- practitioners.id (not user id)
    v_new_id      UUID;
BEGIN
    -- Lock old referral
    SELECT * INTO v_old
    FROM referrals
    WHERE id = p_referral_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referral % not found', p_referral_id;
    END IF;

    IF v_old.status NOT IN ('sent','viewed','accepted','in_progress') THEN
        RAISE EXCEPTION 'Cannot redirect a referral with status %', v_old.status;
    END IF;

    -- Resolve practitioner record from user id
    SELECT id INTO v_new_doctor
    FROM practitioners
    WHERE user_id = p_new_doctor_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No practitioner profile for user %', p_new_doctor_user_id;
    END IF;

    -- Create new referral
    INSERT INTO referrals (
        patient_id,
        referring_practitioner_id,
        receiving_practitioner_id,
        receiving_center_id,
        status,
        urgency,
        reason,
        clinical_notes,
        diagnosis_code,
        requested_specialty,
        expires_at,
        sent_at
    )
    VALUES (
        v_old.patient_id,
        v_old.referring_practitioner_id,
        v_new_doctor,
        p_new_center_id,
        'sent',
        v_old.urgency,
        v_old.reason,
        v_old.clinical_notes,
        v_old.diagnosis_code,
        v_old.requested_specialty,
        NOW() + INTERVAL '30 days',
        NOW()
    )
    RETURNING id INTO v_new_id;

    -- Mark old referral as redirected and link to new
    UPDATE referrals
    SET status                    = 'redirected',
        redirected_to_referral_id = v_new_id,
        updated_at                = NOW()
    WHERE id = p_referral_id;

    -- Audit events
    INSERT INTO referral_events (referral_id, event_type)
    VALUES (p_referral_id, 'redirected'),
           (v_new_id,      'sent');

    RETURN v_new_id;
END;
$$;
