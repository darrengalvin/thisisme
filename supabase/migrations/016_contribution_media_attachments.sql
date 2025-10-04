-- Create table to link contributions with media attachments
CREATE TABLE IF NOT EXISTS public.contribution_media_attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contribution_id uuid REFERENCES public.memory_contributions(id) ON DELETE CASCADE NOT NULL,
  media_id uuid REFERENCES public.media(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(contribution_id, media_id) -- Prevent duplicate attachments
);

-- Add RLS policies
ALTER TABLE public.contribution_media_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view attachments for contributions they have access to
CREATE POLICY "Users can view contribution media attachments" ON public.contribution_media_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memory_contributions mc
      JOIN public.memories m ON mc.memory_id = m.id
      LEFT JOIN public.memory_collaborations mc2 ON m.id = mc2.memory_id
      WHERE contribution_media_attachments.contribution_id = mc.id
      AND (
        m.user_id = auth.uid() OR
        (mc2.collaborator_id = auth.uid() AND mc2.status = 'accepted')
      )
    )
  );

-- Policy: Users can create attachments for contributions they made
CREATE POLICY "Users can create contribution media attachments" ON public.contribution_media_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memory_contributions mc
      WHERE contribution_media_attachments.contribution_id = mc.id
      AND mc.contributor_id = auth.uid()
    )
  );

-- Policy: Users can delete attachments for contributions they made
CREATE POLICY "Users can delete contribution media attachments" ON public.contribution_media_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.memory_contributions mc
      WHERE contribution_media_attachments.contribution_id = mc.id
      AND mc.contributor_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contribution_media_attachments_contribution_id ON public.contribution_media_attachments(contribution_id);
CREATE INDEX IF NOT EXISTS idx_contribution_media_attachments_media_id ON public.contribution_media_attachments(media_id);
