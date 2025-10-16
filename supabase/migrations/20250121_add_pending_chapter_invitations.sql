-- Add pending_chapter_invitations column to user_networks table
-- This stores chapter IDs that a person has been invited to but hasn't joined yet

ALTER TABLE public.user_networks 
ADD COLUMN IF NOT EXISTS pending_chapter_invitations jsonb DEFAULT '[]'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN public.user_networks.pending_chapter_invitations IS 'Array of chapter IDs that this person has been invited to but has not yet joined';




