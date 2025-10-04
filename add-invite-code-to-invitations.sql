-- =====================================================
-- Add invite code to pending_invitations table
-- =====================================================
-- This allows users to manually redeem invitations even if they
-- sign up with a different email/phone than they were invited to

-- Add invite_code column (unique 8-character alphanumeric code)
ALTER TABLE pending_invitations 
ADD COLUMN IF NOT EXISTS invite_code VARCHAR(16) UNIQUE;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_pending_invitations_invite_code 
ON pending_invitations(invite_code) 
WHERE invite_code IS NOT NULL;

-- Function to generate a random invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude similar looking chars (0,O,1,I)
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing invitations with invite codes
DO $$
DECLARE
  invitation_record RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  FOR invitation_record IN 
    SELECT id FROM pending_invitations WHERE invite_code IS NULL
  LOOP
    -- Generate unique code
    LOOP
      new_code := generate_invite_code();
      
      -- Check if code already exists
      SELECT EXISTS(
        SELECT 1 FROM pending_invitations WHERE invite_code = new_code
      ) INTO code_exists;
      
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    -- Update the record
    UPDATE pending_invitations 
    SET invite_code = new_code 
    WHERE id = invitation_record.id;
  END LOOP;
END $$;

-- Make invite_code NOT NULL for future inserts (after backfill)
ALTER TABLE pending_invitations 
ALTER COLUMN invite_code SET NOT NULL;

-- Create a trigger to auto-generate invite codes for new invitations
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  IF NEW.invite_code IS NULL THEN
    -- Generate unique code
    LOOP
      new_code := generate_invite_code();
      
      -- Check if code already exists
      SELECT EXISTS(
        SELECT 1 FROM pending_invitations WHERE invite_code = new_code
      ) INTO code_exists;
      
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    NEW.invite_code := new_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invite_code
BEFORE INSERT ON pending_invitations
FOR EACH ROW
EXECUTE FUNCTION set_invite_code();

-- Add comment
COMMENT ON COLUMN pending_invitations.invite_code IS 'Unique 8-character code that can be used to manually redeem the invitation, useful if user signs up with different email/phone';

