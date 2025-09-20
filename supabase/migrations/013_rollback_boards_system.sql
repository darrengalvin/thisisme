-- =====================================================
-- ROLLBACK SCRIPT - Remove Redundant Board System
-- This removes the duplicate board system and keeps your existing timezones/chapters
-- =====================================================

-- Remove the board_id column we added to memories (if it exists)
ALTER TABLE public.memories DROP COLUMN IF EXISTS board_id;

-- Drop all the redundant tables (in reverse dependency order)
DROP TABLE IF EXISTS public.tag_group_members CASCADE;
DROP TABLE IF EXISTS public.tag_groups CASCADE;
DROP TABLE IF EXISTS public.memory_contributions CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.memory_board_associations CASCADE;
DROP TABLE IF EXISTS public.memory_tags CASCADE;
DROP TABLE IF EXISTS public.user_networks CASCADE;
DROP TABLE IF EXISTS public.board_memberships CASCADE;
DROP TABLE IF EXISTS public.memory_boards CASCADE;

-- Drop indexes that were created for the board system
DROP INDEX IF EXISTS idx_memory_boards_owner;
DROP INDEX IF EXISTS idx_memory_boards_type;
DROP INDEX IF EXISTS idx_memory_boards_privacy;
DROP INDEX IF EXISTS idx_board_memberships_user;
DROP INDEX IF EXISTS idx_board_memberships_board;
DROP INDEX IF EXISTS idx_board_memberships_status;
DROP INDEX IF EXISTS idx_user_networks_owner;
DROP INDEX IF EXISTS idx_user_networks_email;
DROP INDEX IF EXISTS idx_user_networks_user_id;
DROP INDEX IF EXISTS idx_user_networks_name_search;
DROP INDEX IF EXISTS idx_memory_tags_memory;
DROP INDEX IF EXISTS idx_memory_tags_person;
DROP INDEX IF EXISTS idx_memory_tags_tagger;
DROP INDEX IF EXISTS idx_notifications_user_unread;

-- Your original system remains intact:
-- ✅ users table
-- ✅ timezones table (your chapters)
-- ✅ timezone_members table (people in chapters)
-- ✅ memories table (linked to timezones)
-- ✅ media table
-- ✅ invitations table

COMMENT ON SCHEMA public IS 'Rollback complete - redundant board system removed, original timezones system preserved';
