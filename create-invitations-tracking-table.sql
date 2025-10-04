-- =====================================================
-- Create invitations tracking table
-- =====================================================
-- This table tracks all pending invitations (email, SMS, or both)
-- and stores which chapters the invitee should get access to

CREATE TABLE IF NOT EXISTS pending_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who sent the invite
  inviter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Who is being invited (at least one must be provided)
  invitee_email VARCHAR(255),
  invitee_phone VARCHAR(50),
  invitee_name VARCHAR(255) NOT NULL,
  
  -- What they're being invited to
  invited_chapters UUID[] DEFAULT '{}', -- Array of chapter IDs
  relationship VARCHAR(100),
  custom_message TEXT,
  
  -- Invitation method
  invite_method VARCHAR(20) CHECK (invite_method IN ('email', 'sms', 'both')),
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Indexes for lookups
  CONSTRAINT at_least_one_contact CHECK (
    invitee_email IS NOT NULL OR invitee_phone IS NOT NULL
  )
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_pending_invitations_email ON pending_invitations(invitee_email) WHERE invitee_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pending_invitations_phone ON pending_invitations(invitee_phone) WHERE invitee_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pending_invitations_status ON pending_invitations(status);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_inviter ON pending_invitations(inviter_user_id);

-- Add comments
COMMENT ON TABLE pending_invitations IS 'Tracks pending invitations sent via email/SMS and the chapters they should access';
COMMENT ON COLUMN pending_invitations.invited_chapters IS 'Array of chapter UUIDs the invitee will get access to upon signup';
COMMENT ON COLUMN pending_invitations.status IS 'pending: waiting for signup, accepted: user signed up and got access, expired: invitation expired, cancelled: invitation cancelled by inviter';

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE pending_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- You can optionally set up a cron job to run this, or call it periodically
-- For now, we'll just have the function available

