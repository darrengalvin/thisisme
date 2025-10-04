-- Safe User Deletion Script
-- This script deletes a user and all associated data in the correct order
-- Replace 'USER_ID_HERE' with the actual user ID you want to delete

-- Set the user ID to delete
\set user_id 'USER_ID_HERE'

-- Step 1: Delete from public.users first (this will cascade to most related tables)
-- But first, let's check what data exists for this user
SELECT 
  'public.users' as table_name,
  COUNT(*) as record_count
FROM public.users 
WHERE id = :'user_id'

UNION ALL

SELECT 
  'timezones' as table_name,
  COUNT(*) as record_count
FROM public.timezones 
WHERE creator_id = :'user_id'

UNION ALL

SELECT 
  'memories' as table_name,
  COUNT(*) as record_count
FROM public.memories 
WHERE user_id = :'user_id'

UNION ALL

SELECT 
  'user_networks' as table_name,
  COUNT(*) as record_count
FROM public.user_networks 
WHERE owner_id = :'user_id'

UNION ALL

SELECT 
  'github_connections' as table_name,
  COUNT(*) as record_count
FROM public.github_connections 
WHERE user_id = :'user_id'

UNION ALL

SELECT 
  'support_tickets' as table_name,
  COUNT(*) as record_count
FROM public.tickets 
WHERE creator_id = :'user_id';

-- Step 2: Delete from auth.users (this should work after public.users is deleted)
-- Note: You may need to run this in the Supabase dashboard or with admin privileges

-- First, delete from public.users (this cascades to most related tables)
DELETE FROM public.users WHERE id = :'user_id';

-- Then delete from auth.users
-- WARNING: This requires admin privileges and should be done through Supabase dashboard
-- DELETE FROM auth.users WHERE id = :'user_id';

-- Alternative approach: If you can't delete from auth.users directly,
-- you can disable the user instead:
-- UPDATE auth.users SET email = 'deleted_' || extract(epoch from now()) || '@deleted.local' WHERE id = :'user_id';
