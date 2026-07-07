ALTER TABLE notifications ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES doctor_invitations(id) ON DELETE SET NULL;
