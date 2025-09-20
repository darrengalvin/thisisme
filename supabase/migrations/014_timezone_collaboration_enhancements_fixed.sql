-- =====================================================
-- TIMEZONE COLLABORATION ENHANCEMENTS (FIXED ORDER)
-- Adds @ tagging, user networks, and contributions to existing system
-- =====================================================

-- First, create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type text CHECK (type IN ('TIMEZONE_INVITATION', 'NEW_MEMORY', 'MEMBER_JOINED', 'MEMORY_TAG', 'MEMORY_CONTRIBUTION', 'TIMEZONE_MEMORY_ADDED')) NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- If notifications table already exists, just extend the constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
      CHECK (type IN ('TIMEZONE_INVITATION', 'NEW_MEMORY', 'MEMBER_JOINED', 'MEMORY_TAG', 'MEMORY_CONTRIBUTION', 'TIMEZONE_MEMORY_ADDED'));
  END IF;
END $$;

-- 1. User Networks - Personal contacts for @ tagging
CREATE TABLE public.user_networks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  person_name text NOT NULL,
  person_email text,
  person_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL, -- If they join the platform
  relationship text, -- "Family", "Friend", "Colleague", etc.
  notes text, -- Optional notes about this person
  photo_url text, -- Optional photo URL
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Memory Tags - @ tags in memories
CREATE TABLE public.memory_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id uuid REFERENCES public.memories(id) ON DELETE CASCADE NOT NULL,
  tagged_person_id uuid REFERENCES public.user_networks(id) ON DELETE CASCADE NOT NULL,
  tagged_by_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(memory_id, tagged_person_id) -- Prevent duplicate tags
);

-- 3. Memory Contributions - Others adding to memories
CREATE TABLE public.memory_contributions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id uuid REFERENCES public.memories(id) ON DELETE CASCADE NOT NULL,
  contributor_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  contribution_type text CHECK (contribution_type IN ('COMMENT', 'ADDITION', 'CORRECTION')) NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Photo Tags - Tagging people in specific locations on photos
CREATE TABLE public.photo_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  media_id uuid REFERENCES public.media(id) ON DELETE CASCADE NOT NULL,
  tagged_person_id uuid REFERENCES public.user_networks(id) ON DELETE CASCADE NOT NULL,
  tagged_by_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  -- Coordinates as percentages (0-100) for responsive positioning
  x_position decimal(5,2) NOT NULL CHECK (x_position >= 0 AND x_position <= 100),
  y_position decimal(5,2) NOT NULL CHECK (y_position >= 0 AND y_position <= 100),
  -- Optional tag size (width/height as percentages)
  tag_width decimal(5,2) DEFAULT 10 CHECK (tag_width > 0 AND tag_width <= 50),
  tag_height decimal(5,2) DEFAULT 10 CHECK (tag_height > 0 AND tag_height <= 50),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(media_id, tagged_person_id) -- One tag per person per photo
);

-- Create indexes for performance (notifications table exists now)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

CREATE INDEX idx_user_networks_owner ON public.user_networks(owner_id);
CREATE INDEX idx_user_networks_email ON public.user_networks(person_email);
CREATE INDEX idx_user_networks_user_id ON public.user_networks(person_user_id);
CREATE INDEX idx_user_networks_name_search ON public.user_networks USING gin(to_tsvector('english', person_name));

CREATE INDEX idx_memory_tags_memory ON public.memory_tags(memory_id);
CREATE INDEX idx_memory_tags_person ON public.memory_tags(tagged_person_id);
CREATE INDEX idx_memory_tags_tagger ON public.memory_tags(tagged_by_user_id);

CREATE INDEX idx_memory_contributions_memory ON public.memory_contributions(memory_id);
CREATE INDEX idx_memory_contributions_contributor ON public.memory_contributions(contributor_id);

CREATE INDEX idx_photo_tags_media ON public.photo_tags(media_id);
CREATE INDEX idx_photo_tags_person ON public.photo_tags(tagged_person_id);
CREATE INDEX idx_photo_tags_tagger ON public.photo_tags(tagged_by_user_id);

-- Add updated_at triggers
CREATE TRIGGER user_networks_updated_at BEFORE UPDATE ON public.user_networks
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER memory_contributions_updated_at BEFORE UPDATE ON public.memory_contributions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_tags ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true); -- Allow system to create notifications

-- Photo Tags Policies
CREATE POLICY "Users can view photo tags in accessible media" ON public.photo_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.media m
      JOIN public.memories mem ON m.memory_id = mem.id
      JOIN public.timezone_members tm ON mem.timezone_id = tm.timezone_id
      WHERE m.id = photo_tags.media_id AND tm.user_id = auth.uid()
    ) OR tagged_by_user_id = auth.uid()
  );

CREATE POLICY "Users can create photo tags for accessible media" ON public.photo_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.media m
      JOIN public.memories mem ON m.memory_id = mem.id
      JOIN public.timezone_members tm ON mem.timezone_id = tm.timezone_id
      WHERE m.id = photo_tags.media_id AND tm.user_id = auth.uid()
    ) AND tagged_by_user_id = auth.uid()
  );

CREATE POLICY "Users can update own photo tags" ON public.photo_tags
  FOR UPDATE USING (auth.uid() = tagged_by_user_id);

CREATE POLICY "Users can delete own photo tags" ON public.photo_tags
  FOR DELETE USING (auth.uid() = tagged_by_user_id);

-- User Networks Policies
CREATE POLICY "Users can view own network" ON public.user_networks
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can manage own network" ON public.user_networks
  FOR ALL USING (auth.uid() = owner_id);

-- Memory Tags Policies
CREATE POLICY "Users can view tags in accessible memories" ON public.memory_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_tags.memory_id AND (
        m.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.timezone_members tm
          WHERE tm.timezone_id = m.timezone_id AND tm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create tags in accessible memories" ON public.memory_tags
  FOR INSERT WITH CHECK (
    auth.uid() = tagged_by_user_id AND
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id AND (
        m.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.timezone_members tm
          WHERE tm.timezone_id = m.timezone_id AND tm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete own tags" ON public.memory_tags
  FOR DELETE USING (auth.uid() = tagged_by_user_id);

-- Memory Contributions Policies
CREATE POLICY "Users can view contributions in accessible memories" ON public.memory_contributions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_contributions.memory_id AND (
        m.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.timezone_members tm
          WHERE tm.timezone_id = m.timezone_id AND tm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Timezone members can contribute to memories" ON public.memory_contributions
  FOR INSERT WITH CHECK (
    auth.uid() = contributor_id AND
    EXISTS (
      SELECT 1 FROM public.memories m
      JOIN public.timezone_members tm ON tm.timezone_id = m.timezone_id
      WHERE m.id = memory_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own contributions" ON public.memory_contributions
  FOR UPDATE USING (auth.uid() = contributor_id);

CREATE POLICY "Users can delete own contributions" ON public.memory_contributions
  FOR DELETE USING (auth.uid() = contributor_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to create notification for memory tag
CREATE OR REPLACE FUNCTION public.notify_memory_tag()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if the tagged person is a platform user
  IF NEW.tagged_person_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT 
      un.person_user_id,
      'MEMORY_TAG',
      'You were tagged in a memory',
      'You were mentioned in "' || COALESCE(m.title, 'Untitled Memory') || '"',
      jsonb_build_object(
        'memory_id', NEW.memory_id,
        'tagged_by', u.email,
        'memory_title', m.title
      )
    FROM public.user_networks un
    JOIN public.memories m ON m.id = NEW.memory_id
    JOIN public.users u ON u.id = NEW.tagged_by_user_id
    WHERE un.id = NEW.tagged_person_id 
    AND un.person_user_id IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for memory contribution
CREATE OR REPLACE FUNCTION public.notify_memory_contribution()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify the memory owner
  INSERT INTO public.notifications (user_id, type, title, message, data)
  SELECT 
    m.user_id,
    'MEMORY_CONTRIBUTION',
    'Someone added to your memory',
    u.email || ' added a ' || LOWER(NEW.contribution_type) || ' to "' || COALESCE(m.title, 'Untitled Memory') || '"',
    jsonb_build_object(
      'memory_id', NEW.memory_id,
      'contributor', u.email,
      'contribution_type', NEW.contribution_type,
      'memory_title', m.title
    )
  FROM public.memories m
  JOIN public.users u ON u.id = NEW.contributor_id
  WHERE m.id = NEW.memory_id 
  AND m.user_id != NEW.contributor_id; -- Don't notify yourself
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for notifications (notifications table exists now)
CREATE TRIGGER memory_tag_notification
  AFTER INSERT ON public.memory_tags
  FOR EACH ROW EXECUTE FUNCTION public.notify_memory_tag();

CREATE TRIGGER memory_contribution_notification
  AFTER INSERT ON public.memory_contributions
  FOR EACH ROW EXECUTE FUNCTION public.notify_memory_contribution();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.notifications IS 'User notifications for various system events';
COMMENT ON TABLE public.user_networks IS 'Personal contacts for @ tagging in memories';
COMMENT ON TABLE public.memory_tags IS '@ tags linking people to memories';
COMMENT ON TABLE public.memory_contributions IS 'Contributions from timezone members to memories';

COMMENT ON COLUMN public.user_networks.person_user_id IS 'Links to actual user if they join the platform';
COMMENT ON COLUMN public.memory_tags.tagged_person_id IS 'References user_networks, not direct users';
COMMENT ON COLUMN public.memory_contributions.contribution_type IS 'COMMENT, ADDITION, or CORRECTION';

-- Migration complete
SELECT 'Timezone collaboration enhancements added successfully!' as status;
