-- Test script for studio_email_preferences table
-- Run this in your Supabase SQL editor

-- 1. Check if studio_email_preferences table exists
SELECT 'Checking studio_email_preferences table:' as test_name;
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'studio_email_preferences' 
ORDER BY ordinal_position;

-- 2. Check current email preferences
SELECT 'Current email preferences:' as test_name;
SELECT 
    sep.user_id,
    vp.first_name,
    vp.last_name,
    vp.email,
    sep.livestream_notifications,
    sep.streaming_limit_emails,
    sep.weekly_digest,
    sep.marketing_emails,
    sep.system_notifications,
    sep.created_at,
    sep.updated_at
FROM studio_email_preferences sep
JOIN verified_profiles vp ON sep.user_id = vp.id
ORDER BY sep.created_at DESC
LIMIT 10;

-- 3. Check users without email preferences
SELECT 'Users without email preferences:' as test_name;
SELECT 
    vp.id,
    vp.first_name,
    vp.last_name,
    vp.email
FROM verified_profiles vp
LEFT JOIN studio_email_preferences sep ON vp.id = sep.user_id
WHERE sep.user_id IS NULL
LIMIT 5;

-- 4. Test the helper functions
SELECT 'Testing get_studio_email_preferences function:' as test_name;
SELECT * FROM get_studio_email_preferences(
    (SELECT id FROM verified_profiles LIMIT 1)
);

-- 5. Test updating preferences
SELECT 'Testing update_studio_email_preferences function:' as test_name;
SELECT update_studio_email_preferences(
    (SELECT id FROM verified_profiles LIMIT 1),
    false,  -- livestream_notifications
    true,   -- streaming_limit_emails
    true,   -- weekly_digest
    false,  -- marketing_emails
    true    -- system_notifications
);

-- 6. Verify the update worked
SELECT 'Verifying preference update:' as test_name;
SELECT 
    user_id,
    livestream_notifications,
    streaming_limit_emails,
    weekly_digest,
    marketing_emails,
    system_notifications
FROM studio_email_preferences 
WHERE user_id = (SELECT id FROM verified_profiles LIMIT 1);

-- 7. Test RLS policies
SELECT 'Testing RLS policies:' as test_name;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'studio_email_preferences';

-- 8. Check indexes
SELECT 'Checking indexes on studio_email_preferences:' as test_name;
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'studio_email_preferences';

-- 9. Test bulk operations
SELECT 'Testing bulk preference queries:' as test_name;
SELECT 
    COUNT(*) as total_preferences,
    COUNT(CASE WHEN livestream_notifications = true THEN 1 END) as livestream_enabled,
    COUNT(CASE WHEN streaming_limit_emails = true THEN 1 END) as streaming_limit_enabled,
    COUNT(CASE WHEN weekly_digest = true THEN 1 END) as weekly_digest_enabled,
    COUNT(CASE WHEN marketing_emails = true THEN 1 END) as marketing_enabled,
    COUNT(CASE WHEN system_notifications = true THEN 1 END) as system_enabled
FROM studio_email_preferences;

-- 10. Test notification function integration
SELECT 'Testing notification function integration:' as test_name;
SELECT 
    'To test with notification function, use this payload:' as instruction;
SELECT json_build_object(
    'streamer_id', (SELECT id FROM verified_profiles LIMIT 1),
    'stream_id', 'test-stream-' || extract(epoch from now())::text,
    'stream_title', 'Test Livestream - ' || to_char(now(), 'HH24:MI:SS'),
    'stream_description', 'This is a test livestream to verify email notifications.',
    'stream_url', 'https://biblenow.io/live-stream?room=test-room&title=Test+Stream'
) as test_payload;

-- 11. Performance test
SELECT 'Performance test - count preferences by type:' as test_name;
SELECT 
    'livestream_notifications' as preference_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN livestream_notifications = true THEN 1 END) as enabled_count,
    ROUND(
        COUNT(CASE WHEN livestream_notifications = true THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as enabled_percentage
FROM studio_email_preferences
UNION ALL
SELECT 
    'streaming_limit_emails' as preference_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN streaming_limit_emails = true THEN 1 END) as enabled_count,
    ROUND(
        COUNT(CASE WHEN streaming_limit_emails = true THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as enabled_percentage
FROM studio_email_preferences
UNION ALL
SELECT 
    'weekly_digest' as preference_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN weekly_digest = true THEN 1 END) as enabled_count,
    ROUND(
        COUNT(CASE WHEN weekly_digest = true THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as enabled_percentage
FROM studio_email_preferences
UNION ALL
SELECT 
    'marketing_emails' as preference_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN marketing_emails = true THEN 1 END) as enabled_count,
    ROUND(
        COUNT(CASE WHEN marketing_emails = true THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as enabled_percentage
FROM studio_email_preferences
UNION ALL
SELECT 
    'system_notifications' as preference_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN system_notifications = true THEN 1 END) as enabled_count,
    ROUND(
        COUNT(CASE WHEN system_notifications = true THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as enabled_percentage
FROM studio_email_preferences;
