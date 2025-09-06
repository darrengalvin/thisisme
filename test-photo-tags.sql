-- Test script to check and fix photo tagging system
-- Run this in your Supabase SQL editor

-- 1. Check if photo_tags table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'photo_tags';

-- 2. Check if user_networks table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'user_networks';

-- 3. Check existing media records
SELECT id, memory_id, type, storage_url 
FROM media 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Check existing memories
SELECT id, title, user_id, timezone_id 
FROM memories 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. If photo_tags table doesn't exist, create it manually:
/*
CREATE TABLE IF NOT EXISTS public.photo_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  media_id uuid REFERENCES public.media(id) ON DELETE CASCADE NOT NULL,
  tagged_person_id uuid REFERENCES public.user_networks(id) ON DELETE CASCADE NOT NULL,
  tagged_by_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  x_position decimal(5,2) NOT NULL CHECK (x_position >= 0 AND x_position <= 100),
  y_position decimal(5,2) NOT NULL CHECK (y_position >= 0 AND y_position <= 100),
  tag_width decimal(5,2) DEFAULT 10 CHECK (tag_width > 0 AND tag_width <= 50),
  tag_height decimal(5,2) DEFAULT 10 CHECK (tag_height > 0 AND tag_height <= 50),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(media_id, tagged_person_id)
);

ALTER TABLE public.photo_tags ENABLE ROW LEVEL SECURITY;
*/
