-- Update pending_invitations to use shorter, easier-to-copy invite codes
-- Change from base64 (22-24 chars) to 8-character alphanumeric codes

-- Drop the existing default
ALTER TABLE pending_invitations 
ALTER COLUMN invite_code DROP DEFAULT;

-- Set new default: 8-character uppercase alphanumeric code
ALTER TABLE pending_invitations 
ALTER COLUMN invite_code SET DEFAULT upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));

-- Update any existing invite codes to the new format (only if they're longer than 8 chars)
-- This ensures existing invites still work but new ones are shorter
UPDATE pending_invitations 
SET invite_code = upper(substring(md5(random()::text || clock_timestamp()::text || id::text) from 1 for 8))
WHERE length(invite_code) > 8;

-- Add comment
COMMENT ON COLUMN pending_invitations.invite_code IS '8-character alphanumeric code for easy copying';

