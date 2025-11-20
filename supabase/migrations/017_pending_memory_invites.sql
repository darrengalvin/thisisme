-- =====================================================
-- PENDING MEMORY INVITES
-- Allows inviting users by email even if they don't have an account yet
-- =====================================================

-- 1. Make collaborator_id nullable to support pending invites
ALTER TABLE public.memory_collaborations 
  ALTER COLUMN collaborator_id DROP NOT NULL;

-- 2. Add invited_email field for pending invites
ALTER TABLE public.memory_collaborations 
  ADD COLUMN IF NOT EXISTS invited_email TEXT;

-- 3. Add constraint: either collaborator_id OR invited_email must be set
ALTER TABLE public.memory_collaborations
  ADD CONSTRAINT check_collaborator_or_email 
  CHECK (
    (collaborator_id IS NOT NULL AND invited_email IS NULL) OR 
    (collaborator_id IS NULL AND invited_email IS NOT NULL)
  );

-- 4. Update unique constraint to handle both scenarios
ALTER TABLE public.memory_collaborations 
  DROP CONSTRAINT IF EXISTS memory_collaborations_memory_id_collaborator_id_key;

-- Add separate unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_collab_unique_user 
  ON public.memory_collaborations(memory_id, collaborator_id) 
  WHERE collaborator_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_collab_unique_email 
  ON public.memory_collaborations(memory_id, invited_email) 
  WHERE invited_email IS NOT NULL;

-- 5. Add index on invited_email for lookups
CREATE INDEX IF NOT EXISTS idx_memory_collaborations_invited_email 
  ON public.memory_collaborations(invited_email) 
  WHERE invited_email IS NOT NULL;

-- 6. Update RLS policy to include email-based invites
DROP POLICY IF EXISTS "Users can view their collaborations" ON public.memory_collaborations;

CREATE POLICY "Users can view their collaborations" ON public.memory_collaborations
  FOR SELECT USING (
    collaborator_id = auth.uid() OR 
    invited_by = auth.uid() OR
    invited_email = (SELECT email FROM public.users WHERE id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.memories 
      WHERE memories.id = memory_collaborations.memory_id 
      AND memories.user_id = auth.uid()
    )
  );

-- 7. Function to automatically link pending invites when a user signs up
CREATE OR REPLACE FUNCTION public.link_pending_memory_invites()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all pending invites for this email
  UPDATE public.memory_collaborations
  SET 
    collaborator_id = NEW.id,
    invited_email = NULL,
    updated_at = NOW()
  WHERE invited_email = NEW.email
    AND collaborator_id IS NULL
    AND status = 'pending';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger to run the function when a new user signs up
DROP TRIGGER IF EXISTS trigger_link_memory_invites ON public.users;

CREATE TRIGGER trigger_link_memory_invites
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_pending_memory_invites();

-- 9. Add comments
COMMENT ON COLUMN public.memory_collaborations.invited_email IS 'Email address for pending invites (users who havent signed up yet)';
COMMENT ON FUNCTION public.link_pending_memory_invites() IS 'Automatically links pending memory invites when a user signs up';

