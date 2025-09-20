-- =====================================================
-- PHOTO TAGGING SYSTEM
-- Adds photo tagging functionality to existing collaboration system
-- =====================================================

-- 1. Photo Tags - Tagging people in specific locations on photos
CREATE TABLE IF NOT EXISTS public.photo_tags (
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_photo_tags_media ON public.photo_tags(media_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_person ON public.photo_tags(tagged_person_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_tagger ON public.photo_tags(tagged_by_user_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on photo_tags table
ALTER TABLE public.photo_tags ENABLE ROW LEVEL SECURITY;

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

-- =====================================================
-- EXTEND EXISTING NOTIFICATIONS TABLE
-- =====================================================

-- Add photo tag notification type to existing constraint (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
    -- Drop existing constraint if it exists
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    -- Add new constraint with photo tag type
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
      CHECK (type IN ('TIMEZONE_INVITATION', 'NEW_MEMORY', 'MEMBER_JOINED', 'MEMORY_TAG', 'MEMORY_CONTRIBUTION', 'TIMEZONE_MEMORY_ADDED', 'PHOTO_TAG'));
  END IF;
END $$;
