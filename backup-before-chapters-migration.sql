-- Backup Script: Before Timezones → Chapters Migration
-- Run this in Supabase SQL Editor to create a complete backup
-- Date: $(date)

-- Create backup schema
CREATE SCHEMA IF NOT EXISTS backup_timezones_migration;

-- Drop existing backup tables if they exist (in case running again)
DROP TABLE IF EXISTS backup_timezones_migration.timezones_backup;
DROP TABLE IF EXISTS backup_timezones_migration.timezone_members_backup;
DROP TABLE IF EXISTS backup_timezones_migration.memories_backup;
DROP TABLE IF EXISTS backup_timezones_migration.invitations_backup;
DROP TABLE IF EXISTS backup_timezones_migration.backup_summary;
DROP TABLE IF EXISTS backup_timezones_migration.relationship_check;

-- Backup timezones table
CREATE TABLE backup_timezones_migration.timezones_backup AS 
SELECT * FROM public.timezones;

-- Backup timezone_members table  
CREATE TABLE backup_timezones_migration.timezone_members_backup AS
SELECT * FROM public.timezone_members;

-- Backup memories table (focusing on timezone_id relationships)
CREATE TABLE backup_timezones_migration.memories_backup AS
SELECT * FROM public.memories;

-- Backup invitations table (if it exists and has timezone references)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations' AND table_schema = 'public') THEN
        EXECUTE 'CREATE TABLE backup_timezones_migration.invitations_backup AS SELECT * FROM public.invitations';
    END IF;
END $$;

-- Create a summary report of what we're backing up
CREATE TABLE backup_timezones_migration.backup_summary AS
SELECT 
    'timezones' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM public.timezones
UNION ALL
SELECT 
    'timezone_members' as table_name,
    COUNT(*) as record_count,
    MIN(joined_at) as oldest_record,
    MAX(joined_at) as newest_record  
FROM public.timezone_members
UNION ALL
SELECT 
    'memories_with_timezone' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM public.memories 
WHERE timezone_id IS NOT NULL
UNION ALL
SELECT 
    'memories_without_timezone' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM public.memories 
WHERE timezone_id IS NULL;

-- Create relationship verification table
CREATE TABLE backup_timezones_migration.relationship_check AS
SELECT 
    t.id as timezone_id,
    t.title as timezone_title,
    t.creator_id,
    COUNT(DISTINCT m.id) as memory_count,
    COUNT(DISTINCT tm.user_id) as member_count
FROM public.timezones t
LEFT JOIN public.memories m ON m.timezone_id = t.id
LEFT JOIN public.timezone_members tm ON tm.timezone_id = t.id
GROUP BY t.id, t.title, t.creator_id
ORDER BY t.created_at;

-- Verify backup was successful
SELECT 
    'BACKUP VERIFICATION' as status,
    'Original timezones: ' || (SELECT COUNT(*) FROM public.timezones) ||
    ', Backed up: ' || (SELECT COUNT(*) FROM backup_timezones_migration.timezones_backup) as timezones_check,
    'Original members: ' || (SELECT COUNT(*) FROM public.timezone_members) ||
    ', Backed up: ' || (SELECT COUNT(*) FROM backup_timezones_migration.timezone_members_backup) as members_check,
    'Original memories: ' || (SELECT COUNT(*) FROM public.memories) ||
    ', Backed up: ' || (SELECT COUNT(*) FROM backup_timezones_migration.memories_backup) as memories_check;

-- Show backup summary
SELECT * FROM backup_timezones_migration.backup_summary ORDER BY table_name;

-- Show relationship summary  
SELECT * FROM backup_timezones_migration.relationship_check;

-- Instructions for restore (if needed)
/*
TO RESTORE FROM BACKUP (if migration fails):

-- 1. Drop any new tables created during migration
DROP TABLE IF EXISTS public.chapters CASCADE;
DROP TABLE IF EXISTS public.chapter_members CASCADE;

-- 2. Restore original data (if somehow corrupted)
TRUNCATE public.timezones CASCADE;
TRUNCATE public.timezone_members CASCADE; 
TRUNCATE public.memories CASCADE;

INSERT INTO public.timezones SELECT * FROM backup_timezones_migration.timezones_backup;
INSERT INTO public.timezone_members SELECT * FROM backup_timezones_migration.timezone_members_backup;
INSERT INTO public.memories SELECT * FROM backup_timezones_migration.memories_backup;

-- 3. Verify restore
SELECT COUNT(*) FROM public.timezones;
SELECT COUNT(*) FROM public.timezone_members;
SELECT COUNT(*) FROM public.memories;

-- 4. Clean up backup schema (optional)
DROP SCHEMA backup_timezones_migration CASCADE;
*/
