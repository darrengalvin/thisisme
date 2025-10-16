-- Fix existing memories with NULL timezone_id
-- This will assign them to the "East End" chapter (most recent one listed)

-- First, let's see which memories need fixing
SELECT 
  id,
  title,
  text_content,
  timezone_id,
  created_at
FROM memories
WHERE user_id = '9a9c09ee-8d59-450b-bf43-58ee373621b8'
  AND timezone_id IS NULL
ORDER BY created_at DESC;

-- Now assign them to "East End" chapter
UPDATE memories
SET timezone_id = '0f94b964-0065-45d8-b235-e9a5f3de0806'
WHERE user_id = '9a9c09ee-8d59-450b-bf43-58ee373621b8'
  AND timezone_id IS NULL;

-- Verify the update
SELECT 
  m.id,
  m.title,
  m.text_content,
  m.timezone_id,
  tz.title as chapter_title,
  m.created_at
FROM memories m
LEFT JOIN timezones tz ON m.timezone_id = tz.id
WHERE m.user_id = '9a9c09ee-8d59-450b-bf43-58ee373621b8'
ORDER BY m.created_at DESC;

