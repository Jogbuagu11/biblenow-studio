-- Test script for going live email notifications
-- This tests the complete flow from stream creation to email delivery

-- 1. Check system prerequisites
SELECT '=== SYSTEM PREREQUISITES ===' as test_section;

-- Check if we have users
SELECT 'Users available for testing:' as test_name;
SELECT 
    id,
    first_name,
    last_name,
    email,
    created_at
FROM verified_profiles 
ORDER BY created_at DESC
LIMIT 5;

-- Check follower relationships
SELECT 'Follower relationships:' as test_name;
SELECT 
    uf.follower_id,
    uf.following_id,
    f.first_name as follower_name,
    f.email as follower_email,
    s.first_name as streamer_name,
    s.email as streamer_email,
    uf.created_at as follow_date
FROM user_follows uf
JOIN verified_profiles f ON uf.follower_id = f.id
JOIN verified_profiles s ON uf.following_id = s.id
ORDER BY uf.created_at DESC
LIMIT 5;

-- 2. Check email preferences setup
SELECT '=== EMAIL PREFERENCES ===' as test_section;

-- Check if email_preferences column exists in verified_profiles
SELECT 'Email preferences column status:' as test_name;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'verified_profiles' 
            AND column_name = 'email_preferences'
        ) THEN 'EXISTS - Using JSONB column'
        ELSE 'NOT EXISTS - Need to set up email preferences'
    END as email_preferences_status;

-- Check if studio_email_preferences table exists
SELECT 'Studio email preferences table status:' as test_name;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'studio_email_preferences'
        ) THEN 'EXISTS - Using dedicated table'
        ELSE 'NOT EXISTS - Using JSONB or not set up'
    END as studio_email_preferences_status;

-- Check current email preferences (if using JSONB)
SELECT 'Current email preferences (JSONB):' as test_name;
SELECT 
    id,
    first_name,
    email,
    email_preferences
FROM verified_profiles 
WHERE email_preferences IS NOT NULL
AND email_preferences != '{}'::jsonb
LIMIT 3;

-- Check current email preferences (if using dedicated table)
SELECT 'Current email preferences (dedicated table):' as test_name;
SELECT 
    sep.user_id,
    vp.first_name,
    vp.email,
    sep.livestream_notifications,
    sep.streaming_limit_emails
FROM studio_email_preferences sep
JOIN verified_profiles vp ON sep.user_id = vp.id
LIMIT 3;

-- 3. Check notification function
SELECT '=== NOTIFICATION FUNCTION ===' as test_section;

-- Check if notification function exists
SELECT 'Notification function status:' as test_name;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%notification%';

-- 4. Create test data if needed
SELECT '=== CREATING TEST DATA ===' as test_section;

-- Create test follow relationship if none exist
INSERT INTO user_follows (follower_id, following_id)
SELECT 
    (SELECT id FROM verified_profiles ORDER BY created_at DESC LIMIT 1 OFFSET 1) as follower_id,
    (SELECT id FROM verified_profiles ORDER BY created_at DESC LIMIT 1) as following_id
WHERE NOT EXISTS (
    SELECT 1 FROM user_follows 
    WHERE follower_id = (SELECT id FROM verified_profiles ORDER BY created_at DESC LIMIT 1 OFFSET 1)
    AND following_id = (SELECT id FROM verified_profiles ORDER BY created_at DESC LIMIT 1)
)
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- Set up email preferences for test users (JSONB approach)
UPDATE verified_profiles 
SET email_preferences = COALESCE(email_preferences, '{}'::jsonb) || '{"livestreamNotifications": true, "streamingLimitEmails": true}'::jsonb
WHERE id IN (
    SELECT id FROM verified_profiles 
    ORDER BY created_at DESC 
    LIMIT 2
)
AND (email_preferences IS NULL OR email_preferences = '{}'::jsonb);

-- Set up email preferences for test users (dedicated table approach)
INSERT INTO studio_email_preferences (
    user_id,
    livestream_notifications,
    streaming_limit_emails,
    weekly_digest,
    marketing_emails,
    system_notifications
)
SELECT 
    id,
    true,  -- livestream_notifications
    true,  -- streaming_limit_emails
    false, -- weekly_digest
    false, -- marketing_emails
    true   -- system_notifications
FROM verified_profiles 
WHERE id IN (
    SELECT id FROM verified_profiles 
    ORDER BY created_at DESC 
    LIMIT 2
)
ON CONFLICT (user_id) DO UPDATE SET
    livestream_notifications = true,
    streaming_limit_emails = true;

-- 5. Test notification function payload
SELECT '=== TEST PAYLOAD ===' as test_section;

SELECT 'Test payload for notification function:' as test_name;
SELECT 'Go to Supabase Dashboard > Functions > send-livestream-notification > Invoke' as instruction;

-- Generate test payload with real user IDs
SELECT json_build_object(
    'streamer_id', (SELECT id FROM verified_profiles ORDER BY created_at DESC LIMIT 1),
    'stream_id', 'test-stream-' || extract(epoch from now())::text,
    'stream_title', 'Test Bible Study - ' || to_char(now(), 'HH24:MI:SS'),
    'stream_description', 'This is a test livestream to verify email notifications are working correctly. Join us for a spiritual journey!',
    'stream_url', 'https://biblenow.io/live-stream?room=test-bible-study&title=Test+Bible+Study'
) as test_payload;

-- 6. Check recent notifications
SELECT '=== RECENT NOTIFICATIONS ===' as test_section;

SELECT 'Recent email notifications in database:' as test_name;
SELECT 
    user_id,
    type,
    title,
    body,
    created_at,
    metadata
FROM studio_notifications 
WHERE type = 'livestream_notification_email' 
ORDER BY created_at DESC 
LIMIT 5;

-- 7. Test followers for specific streamer
SELECT '=== FOLLOWER TEST ===' as test_section;

SELECT 'Followers for test streamer:' as test_name;
SELECT 
    uf.follower_id,
    vp.first_name,
    vp.last_name,
    vp.email,
    CASE 
        WHEN vp.email_preferences IS NOT NULL 
        THEN COALESCE((vp.email_preferences->>'livestreamNotifications')::boolean, true)
        ELSE true
    END as notifications_enabled_jsonb,
    CASE 
        WHEN sep.livestream_notifications IS NOT NULL 
        THEN sep.livestream_notifications
        ELSE true
    END as notifications_enabled_dedicated
FROM user_follows uf
JOIN verified_profiles vp ON uf.follower_id = vp.id
LEFT JOIN studio_email_preferences sep ON vp.id = sep.user_id
WHERE uf.following_id = (SELECT id FROM verified_profiles ORDER BY created_at DESC LIMIT 1);

-- 8. Environment check
SELECT '=== ENVIRONMENT CHECK ===' as test_section;

SELECT 'Environment variables needed:' as test_name;
SELECT 
    'RESEND_API_KEY' as env_var,
    'Required for sending emails via Resend API' as description
UNION ALL
SELECT 
    'SUPABASE_URL' as env_var,
    'Supabase project URL for function calls' as description
UNION ALL
SELECT 
    'SUPABASE_SERVICE_ROLE_KEY' as env_var,
    'Service role key for server-side operations' as description;

-- 9. Manual test steps
SELECT '=== MANUAL TEST STEPS ===' as test_section;

SELECT 'Step-by-step testing instructions:' as test_name;
SELECT 
    1 as step,
    'Go to Supabase Dashboard > Functions > send-livestream-notification' as instruction
UNION ALL
SELECT 
    2 as step,
    'Click "Invoke function" button' as instruction
UNION ALL
SELECT 
    3 as step,
    'Copy the test payload from above and paste it' as instruction
UNION ALL
SELECT 
    4 as step,
    'Click "Invoke" to send the test notification' as instruction
UNION ALL
SELECT 
    5 as step,
    'Check the response for success/failure' as instruction
UNION ALL
SELECT 
    6 as step,
    'Check studio_notifications table for new entries' as instruction
UNION ALL
SELECT 
    7 as step,
    'Check email inboxes of followers for notifications' as instruction;

-- 10. Expected results
SELECT '=== EXPECTED RESULTS ===' as test_section;

SELECT 'What to expect:' as test_name;
SELECT 
    'Function Response' as check_type,
    '{"success": true, "notifications_sent": X, "total_followers": Y}' as expected_result
UNION ALL
SELECT 
    'Database Logs' as check_type,
    'New entries in studio_notifications with type "livestream_notification_email"' as expected_result
UNION ALL
SELECT 
    'Email Delivery' as check_type,
    'Emails received in followers inboxes (check spam folder too)' as expected_result
UNION ALL
SELECT 
    'Email Content' as check_type,
    'Professional HTML email with stream details and join link' as expected_result;

-- 11. Troubleshooting
SELECT '=== TROUBLESHOOTING ===' as test_section;

SELECT 'Common issues and solutions:' as test_name;
SELECT 
    'No followers found' as issue,
    'Create test follow relationships using the INSERT statement above' as solution
UNION ALL
SELECT 
    'Function not found' as issue,
    'Deploy the function: supabase functions deploy send-livestream-notification' as solution
UNION ALL
SELECT 
    'Email not sent' as issue,
    'Check RESEND_API_KEY environment variable and function logs' as solution
UNION ALL
SELECT 
    'Permission denied' as issue,
    'Verify RLS policies and service role key permissions' as solution;
