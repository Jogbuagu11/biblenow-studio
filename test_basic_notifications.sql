-- Basic test for livestream notifications (without email_preferences column)
-- Run this in your Supabase SQL editor

-- 1. Check if we have users
SELECT 'Users in verified_profiles:' as test_name;
SELECT id, first_name, last_name, email
FROM verified_profiles 
LIMIT 5;

-- 2. Check follower relationships
SELECT 'Follower relationships:' as test_name;
SELECT 
    uf.follower_id,
    uf.following_id,
    f.first_name as follower_name,
    f.email as follower_email,
    s.first_name as streamer_name,
    s.email as streamer_email
FROM user_follows uf
JOIN verified_profiles f ON uf.follower_id = f.id
JOIN verified_profiles s ON uf.following_id = s.id
LIMIT 5;

-- 3. Check recent notifications
SELECT 'Recent email notifications:' as test_name;
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

-- 4. Check if notification function exists
SELECT 'Checking if notification function exists:' as test_name;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%notification%';

-- 5. Check if we can create a test follow relationship
SELECT 'Available users for testing:' as test_name;
SELECT 
    id,
    first_name,
    last_name,
    email
FROM verified_profiles 
LIMIT 2;

-- 6. Create test follow relationship (if needed)
-- Uncomment and modify the user IDs below if you want to create test data
/*
INSERT INTO user_follows (follower_id, following_id)
SELECT 
    (SELECT id FROM verified_profiles LIMIT 1 OFFSET 1) as follower_id,
    (SELECT id FROM verified_profiles LIMIT 1) as following_id
WHERE NOT EXISTS (
    SELECT 1 FROM user_follows 
    WHERE follower_id = (SELECT id FROM verified_profiles LIMIT 1 OFFSET 1)
    AND following_id = (SELECT id FROM verified_profiles LIMIT 1)
);
*/

-- 7. Test notification function call payload
SELECT 'To test the notification function:' as test_name;
SELECT 'Go to Supabase Dashboard > Functions > send-livestream-notification > Invoke' as instruction;
SELECT 'Use this test payload (replace USER_ID with actual user ID):' as payload_label;
SELECT json_build_object(
    'streamer_id', (SELECT id FROM verified_profiles LIMIT 1),
    'stream_id', 'test-stream-' || extract(epoch from now())::text,
    'stream_title', 'Test Livestream - ' || to_char(now(), 'HH24:MI:SS'),
    'stream_description', 'This is a test livestream to verify email notifications.',
    'stream_url', 'https://biblenow.io/live-stream?room=test-room&title=Test+Stream'
) as test_payload;

-- 8. Check table structure
SELECT 'verified_profiles table structure:' as test_name;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'verified_profiles' 
ORDER BY ordinal_position;
