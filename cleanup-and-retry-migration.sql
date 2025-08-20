-- Cleanup and Retry Migration Script
-- This safely cleans up partial migration and starts fresh

-- Step 1: Clean up any partially created tables
DROP TABLE IF EXISTS public.chapter_members CASCADE;
DROP TABLE IF EXISTS public.chapters CASCADE;

-- Step 2: Remove any added columns from previous migration attempts
ALTER TABLE public.memories DROP COLUMN IF EXISTS chapter_id;
ALTER TABLE public.invitations DROP COLUMN IF EXISTS chapter_id;

-- Step 3: Now re-create everything fresh
-- Create chapters table
CREATE TABLE public.chapters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  type text CHECK (type IN ('PRIVATE', 'GROUP')) NOT NULL DEFAULT 'PRIVATE',
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  location text,
  invite_code text UNIQUE,
  creator_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  header_image_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 4: Copy all data from timezones to chapters
INSERT INTO public.chapters (
  id, title, description, type, start_date, end_date, 
  location, invite_code, creator_id, header_image_url, 
  created_at, updated_at
)
SELECT 
  id, title, description, type, start_date, end_date,
  location, invite_code, creator_id, header_image_url,
  created_at, updated_at
FROM public.timezones;

-- Step 5: Create chapter_members table
CREATE TABLE public.chapter_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('CREATOR', 'MEMBER')) NOT NULL DEFAULT 'MEMBER',
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(chapter_id, user_id)
);

-- Step 6: Copy all data from timezone_members to chapter_members
INSERT INTO public.chapter_members (id, chapter_id, user_id, role, joined_at)
SELECT id, timezone_id, user_id, role, joined_at
FROM public.timezone_members;

-- Step 7: Add chapter_id column to memories table
ALTER TABLE public.memories ADD COLUMN chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL;

-- Step 8: Copy timezone_id data to chapter_id
UPDATE public.memories 
SET chapter_id = timezone_id 
WHERE timezone_id IS NOT NULL;

-- Step 9: Add chapter_id column to invitations table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations' AND table_schema = 'public') THEN
        EXECUTE 'ALTER TABLE public.invitations ADD COLUMN chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE';
        EXECUTE 'UPDATE public.invitations SET chapter_id = timezone_id WHERE timezone_id IS NOT NULL';
    END IF;
END $$;

-- Step 10: Create indexes
CREATE INDEX idx_chapters_creator_id ON public.chapters(creator_id);
CREATE INDEX idx_chapters_created_at ON public.chapters(created_at DESC);
CREATE INDEX idx_chapter_members_chapter_id ON public.chapter_members(chapter_id);
CREATE INDEX idx_chapter_members_user_id ON public.chapter_members(user_id);
CREATE INDEX idx_memories_chapter_id ON public.memories(chapter_id);

-- Step 11: Enable RLS
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_members ENABLE ROW LEVEL SECURITY;

-- Step 12: Create RLS policies for chapters
CREATE POLICY "Users can view own chapters" ON public.chapters
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert own chapters" ON public.chapters
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own chapters" ON public.chapters
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete own chapters" ON public.chapters
  FOR DELETE USING (auth.uid() = creator_id);

-- Step 13: Create RLS policies for chapter_members
CREATE POLICY "Users can view chapter members for own chapters" ON public.chapter_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chapters 
      WHERE chapters.id = chapter_members.chapter_id 
      AND chapters.creator_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Chapter creators can manage members" ON public.chapter_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.chapters 
      WHERE chapters.id = chapter_members.chapter_id 
      AND chapters.creator_id = auth.uid()
    )
  );

-- Step 14: Verification
SELECT 
    'MIGRATION COMPLETE' as status,
    'Chapters created: ' || (SELECT COUNT(*) FROM public.chapters) as chapters,
    'Members migrated: ' || (SELECT COUNT(*) FROM public.chapter_members) as members,
    'Memories linked: ' || (SELECT COUNT(*) FROM public.memories WHERE chapter_id IS NOT NULL) as linked_memories;

SELECT 
    'DATA INTEGRITY CHECK' as check_type,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.timezones) = (SELECT COUNT(*) FROM public.chapters)
        THEN '✅ All timezones copied to chapters'
        ELSE '❌ Data mismatch detected'
    END as result;
