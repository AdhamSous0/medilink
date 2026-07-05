-- ============================================================
-- V5 — Lab Requests, Results, Availability, Audit Logs
-- ============================================================

-- 1. Availability status on profiles
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'available'
        CHECK (availability_status IN ('available', 'limited', 'unavailable'));

-- 2. Lab requests (center sends to lab)
CREATE TABLE IF NOT EXISTS lab_requests (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id  UUID        NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    requested_by UUID        NOT NULL REFERENCES users(id),
    lab_user_id  UUID        REFERENCES users(id),
    test_type    TEXT        NOT NULL,
    notes        TEXT,
    status       TEXT        NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','in_progress','completed','cancelled')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_requests_referral ON lab_requests(referral_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_lab ON lab_requests(lab_user_id);

-- 3. Lab results
CREATE TABLE IF NOT EXISTS lab_results (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_request_id  UUID        NOT NULL REFERENCES lab_requests(id) ON DELETE CASCADE,
    submitted_by    UUID        NOT NULL REFERENCES users(id),
    findings        TEXT        NOT NULL,
    storage_path    TEXT,
    mime_type       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_results_request ON lab_results(lab_request_id);

-- 4. Audit logs (system-wide immutable)
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
    action      TEXT        NOT NULL,
    entity_type TEXT        NOT NULL,
    entity_id   TEXT,
    payload     JSONB,
    ip_address  TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor      ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity     ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred   ON audit_logs(occurred_at DESC);

-- 5. Triggers for updated_at
CREATE TRIGGER trg_lab_requests_updated_at
    BEFORE UPDATE ON lab_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
