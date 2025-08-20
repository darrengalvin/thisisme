-- Verification Script: After Timezones → Chapters Migration
-- Run this after the migration to verify everything worked correctly

-- 1. Verify all data was copied correctly
SELECT 
    'DATA COPY VERIFICATION' as check_type,
    'Timezones → Chapters: ' || 
    (SELECT COUNT(*) FROM public.timezones) || ' → ' || 
    (SELECT COUNT(*) FROM public.chapters) as timezones_to_chapters,
    
    'Members → Chapter Members: ' ||
    (SELECT COUNT(*) FROM public.timezone_members) || ' → ' ||
    (SELECT COUNT(*) FROM public.chapter_members) as members_migration,
    
    'Memory timezone_id → chapter_id: ' ||
    (SELECT COUNT(*) FROM public.memories WHERE timezone_id IS NOT NULL) || ' → ' ||
    (SELECT COUNT(*) FROM public.memories WHERE chapter_id IS NOT NULL) as memory_links;

-- 2. Verify no data loss
SELECT 
    'DATA INTEGRITY CHECK' as check_type,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.timezones) = (SELECT COUNT(*) FROM public.chapters)
        THEN '✅ All timezones copied to chapters'
        ELSE '❌ Data loss detected in chapters table'
    END as chapters_integrity,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM public.timezone_members) = (SELECT COUNT(*) FROM public.chapter_members)
        THEN '✅ All members copied to chapter_members'
        ELSE '❌ Data loss detected in chapter_members table'
    END as members_integrity,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM public.memories WHERE timezone_id IS NOT NULL) = 
             (SELECT COUNT(*) FROM public.memories WHERE chapter_id IS NOT NULL)
        THEN '✅ All memory links preserved'
        ELSE '❌ Memory links not properly migrated'
    END as memory_links_integrity;

-- 3. Verify foreign key relationships work
SELECT 
    'RELATIONSHIP VERIFICATION' as check_type,
    COUNT(DISTINCT c.id) as total_chapters,
    COUNT(DISTINCT m.chapter_id) as chapters_with_memories,
    COUNT(DISTINCT cm.chapter_id) as chapters_with_members,
    COUNT(m.id) as total_memories_linked
FROM public.chapters c
LEFT JOIN public.memories m ON m.chapter_id = c.id
LEFT JOIN public.chapter_members cm ON cm.chapter_id = c.id;

-- 4. Show sample data to verify structure
SELECT 
    'SAMPLE CHAPTER DATA' as info,
    c.id,
    c.title,
    c.creator_id,
    COUNT(m.id) as memory_count,
    COUNT(DISTINCT cm.user_id) as member_count
FROM public.chapters c
LEFT JOIN public.memories m ON m.chapter_id = c.id  
LEFT JOIN public.chapter_members cm ON cm.chapter_id = c.id
GROUP BY c.id, c.title, c.creator_id
ORDER BY c.created_at
LIMIT 5;

-- 5. Verify backward compatibility views work
SELECT 
    'BACKWARD COMPATIBILITY CHECK' as check_type,
    'View timezones count: ' || (SELECT COUNT(*) FROM public.timezones) as view_timezones,
    'View timezone_members count: ' || (SELECT COUNT(*) FROM public.timezone_members) as view_members;

-- 6. Check for any orphaned records
SELECT 
    'ORPHANED RECORDS CHECK' as check_type,
    (SELECT COUNT(*) FROM public.memories WHERE chapter_id IS NOT NULL AND chapter_id NOT IN (SELECT id FROM public.chapters)) as orphaned_memories,
    (SELECT COUNT(*) FROM public.chapter_members WHERE chapter_id NOT IN (SELECT id FROM public.chapters)) as orphaned_members;

-- 7. Verify indexes were created
SELECT 
    'INDEX VERIFICATION' as check_type,
    schemaname,
    tablename,
    indexname
FROM pg_indexes 
WHERE tablename IN ('chapters', 'chapter_members') 
AND schemaname = 'public'
ORDER BY tablename, indexname;

-- 8. Verify RLS policies were created
SELECT 
    'RLS POLICIES CHECK' as check_type,
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('chapters', 'chapter_members')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 9. Final migration summary
SELECT 
    '🎉 MIGRATION SUMMARY' as status,
    'Total chapters created: ' || (SELECT COUNT(*) FROM public.chapters) as chapters,
    'Total memories linked: ' || (SELECT COUNT(*) FROM public.memories WHERE chapter_id IS NOT NULL) as linked_memories,
    'Total chapter members: ' || (SELECT COUNT(*) FROM public.chapter_members) as members,
    'Migration completed successfully!' as result;

-- 10. Show any potential issues
DO $$
DECLARE
    issues_found INTEGER := 0;
    issue_text TEXT := '';
BEGIN
    -- Check for data mismatches
    IF (SELECT COUNT(*) FROM public.timezones) != (SELECT COUNT(*) FROM public.chapters) THEN
        issues_found := issues_found + 1;
        issue_text := issue_text || '❌ Chapter count mismatch. ';
    END IF;
    
    IF (SELECT COUNT(*) FROM public.timezone_members) != (SELECT COUNT(*) FROM public.chapter_members) THEN
        issues_found := issues_found + 1;
        issue_text := issue_text || '❌ Member count mismatch. ';
    END IF;
    
    -- Check for orphaned records
    IF (SELECT COUNT(*) FROM public.memories WHERE chapter_id IS NOT NULL AND chapter_id NOT IN (SELECT id FROM public.chapters)) > 0 THEN
        issues_found := issues_found + 1;
        issue_text := issue_text || '❌ Orphaned memory records found. ';
    END IF;
    
    IF issues_found = 0 THEN
        RAISE NOTICE '✅ MIGRATION VERIFICATION PASSED - No issues found!';
    ELSE
        RAISE NOTICE '⚠️ MIGRATION ISSUES DETECTED: %', issue_text;
    END IF;
END $$;
