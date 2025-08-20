-- Simple Backup Script - Run this first
-- This creates a clean backup without any complications

-- Create backup schema (safe to run multiple times)
CREATE SCHEMA IF NOT EXISTS backup_migration;

-- Clean up any existing backups (safe to run multiple times)
DROP TABLE IF EXISTS backup_migration.timezones_backup CASCADE;
DROP TABLE IF EXISTS backup_migration.timezone_members_backup CASCADE;
DROP TABLE IF EXISTS backup_migration.memories_backup CASCADE;

-- Create backups
CREATE TABLE backup_migration.timezones_backup AS 
SELECT * FROM public.timezones;

CREATE TABLE backup_migration.timezone_members_backup AS
SELECT * FROM public.timezone_members;

CREATE TABLE backup_migration.memories_backup AS
SELECT * FROM public.memories;

-- Show backup results
SELECT 
    'BACKUP COMPLETE' as status,
    (SELECT COUNT(*) FROM backup_migration.timezones_backup) as timezones_backed_up,
    (SELECT COUNT(*) FROM backup_migration.timezone_members_backup) as members_backed_up,
    (SELECT COUNT(*) FROM backup_migration.memories_backup) as memories_backed_up;

-- Show what we're backing up
SELECT 
    'CURRENT DATA SUMMARY' as info,
    (SELECT COUNT(*) FROM public.timezones) as current_timezones,
    (SELECT COUNT(*) FROM public.timezone_members) as current_members,
    (SELECT COUNT(*) FROM public.memories WHERE timezone_id IS NOT NULL) as memories_with_chapters,
    (SELECT COUNT(*) FROM public.memories WHERE timezone_id IS NULL) as memories_without_chapters;
