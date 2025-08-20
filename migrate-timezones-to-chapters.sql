-- Migration: Rename timezones to chapters
-- This migration safely renames the timezones table and all related references
-- Run this in your Supabase SQL Editor

-- Step 1: Create new chapters table with exact same structure
CREATE TABLE IF NOT EXISTS public.chapters (
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

-- Step 2: Copy all data from timezones to chapters
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

-- Step 3: Create new chapter_members table
CREATE TABLE IF NOT EXISTS public.chapter_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('CREATOR', 'MEMBER')) NOT NULL DEFAULT 'MEMBER',
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(chapter_id, user_id)
);

-- Step 4: Copy all data from timezone_members to chapter_members
INSERT INTO public.chapter_members (id, chapter_id, user_id, role, joined_at)
SELECT id, timezone_id, user_id, role, joined_at
FROM public.timezone_members;

-- Step 5: Add new chapter_id column to memories table
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL;

-- Step 6: Copy timezone_id data to chapter_id
UPDATE public.memories 
SET chapter_id = timezone_id 
WHERE timezone_id IS NOT NULL;

-- Step 7: Update invitations table to reference chapters
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE;

-- Step 8: Copy timeZoneId data to chapter_id in invitations
UPDATE public.invitations 
SET chapter_id = timezone_id 
WHERE timezone_id IS NOT NULL;

-- Step 9: Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_chapters_creator_id ON public.chapters(creator_id);
CREATE INDEX IF NOT EXISTS idx_chapters_created_at ON public.chapters(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chapter_members_chapter_id ON public.chapter_members(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_members_user_id ON public.chapter_members(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_chapter_id ON public.memories(chapter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_chapter_id ON public.invitations(chapter_id);

-- Step 10: Enable RLS on new tables
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_members ENABLE ROW LEVEL SECURITY;

-- Step 11: Create RLS policies for chapters
CREATE POLICY "Users can view own chapters" ON public.chapters
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert own chapters" ON public.chapters
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own chapters" ON public.chapters
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete own chapters" ON public.chapters
  FOR DELETE USING (auth.uid() = creator_id);

-- Step 12: Create RLS policies for chapter_members
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

-- Step 13: Backward compatibility will be handled at the code level
-- We'll keep the original tables for now and update code to use chapters
-- Views are skipped because original tables still exist

-- Note: After running this migration and updating your code:
-- 1. Update all API routes from /timezones/ to /chapters/
-- 2. Update all code references from 'timezones' to 'chapters'
-- 3. Update all 'timezone_id' references to 'chapter_id'
-- 4. Test thoroughly
-- 5. Then run the cleanup script below

-- CLEANUP (Run this AFTER updating all code):
-- DROP VIEW IF EXISTS public.timezones;
-- DROP VIEW IF EXISTS public.timezone_members;
-- DROP TABLE IF EXISTS public.timezone_members;
-- DROP TABLE IF EXISTS public.timezones;
-- ALTER TABLE public.memories DROP COLUMN IF EXISTS timezone_id;
-- ALTER TABLE public.invitations DROP COLUMN IF EXISTS timezone_id;
