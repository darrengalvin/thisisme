-- Create pending_invitations table for tracking invitation records
CREATE TABLE IF NOT EXISTS pending_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who sent the invitation
  inviter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Who is being invited
  invitee_email TEXT,
  invitee_phone TEXT,
  invitee_name TEXT NOT NULL,
  
  -- Invitation details
  relationship TEXT,
  custom_message TEXT,
  invite_method TEXT NOT NULL CHECK (invite_method IN ('email', 'sms', 'both')),
  -- Generate 8-character alphanumeric code (easier to copy than base64)
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8)),
  
  -- Chapter invitations
  invited_chapters UUID[] DEFAULT '{}',
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_invitations_inviter ON pending_invitations(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_invitee_email ON pending_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_invitee_phone ON pending_invitations(invitee_phone);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_invite_code ON pending_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_status ON pending_invitations(status);

-- Add RLS policies
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sent invitations
CREATE POLICY "Users can view their sent invitations"
  ON pending_invitations
  FOR SELECT
  USING (auth.uid() = inviter_user_id);

-- Policy: Users can create invitations
CREATE POLICY "Users can create invitations"
  ON pending_invitations
  FOR INSERT
  WITH CHECK (auth.uid() = inviter_user_id);

-- Policy: Users can update their own invitations
CREATE POLICY "Users can update their invitations"
  ON pending_invitations
  FOR UPDATE
  USING (auth.uid() = inviter_user_id);

-- Policy: Users can delete their own invitations
CREATE POLICY "Users can delete their invitations"
  ON pending_invitations
  FOR DELETE
  USING (auth.uid() = inviter_user_id);

-- Add updated_at trigger
CREATE TRIGGER update_pending_invitations_updated_at
  BEFORE UPDATE ON pending_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE pending_invitations IS 'Tracks pending invitations sent to people to join the platform';
COMMENT ON COLUMN pending_invitations.inviter_user_id IS 'User who sent the invitation';
COMMENT ON COLUMN pending_invitations.invitee_email IS 'Email address of the person being invited';
COMMENT ON COLUMN pending_invitations.invitee_phone IS 'Phone number of the person being invited';
COMMENT ON COLUMN pending_invitations.invitee_name IS 'Name of the person being invited';
COMMENT ON COLUMN pending_invitations.relationship IS 'Relationship between inviter and invitee';
COMMENT ON COLUMN pending_invitations.custom_message IS 'Optional custom message from the inviter';
COMMENT ON COLUMN pending_invitations.invite_method IS 'Method used to send invitation: email, sms, or both';
COMMENT ON COLUMN pending_invitations.invite_code IS 'Unique code for accepting the invitation';
COMMENT ON COLUMN pending_invitations.invited_chapters IS 'Array of chapter UUIDs the invitee will have access to';
COMMENT ON COLUMN pending_invitations.status IS 'Current status: pending, accepted, expired, or cancelled';
COMMENT ON COLUMN pending_invitations.accepted_at IS 'Timestamp when the invitation was accepted';
COMMENT ON COLUMN pending_invitations.expires_at IS 'Timestamp when the invitation expires (default 30 days)';

