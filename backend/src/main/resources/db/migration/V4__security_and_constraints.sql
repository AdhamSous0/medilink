-- ============================================================
-- V4 — Security Constraints & Triggers
-- ============================================================

-- 1. Enforce valid app_status values (C-4)
ALTER TABLE referrals
    ADD CONSTRAINT chk_app_status CHECK (
        app_status IN (
            'pending','accepted','rejected','scheduled',
            'in_progress','completed','redirected','cancelled','expired'
        )
    );

-- 2. updated_at triggers for V3 tables that were missing them (M-4)
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Index on notifications(user_id, read) for the unread-count query (perf)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, read)
    WHERE read = false;

-- 4. Index for message ordering per referral (perf)
CREATE INDEX IF NOT EXISTS idx_messages_referral_created
    ON referral_messages(referral_id, created_at);
