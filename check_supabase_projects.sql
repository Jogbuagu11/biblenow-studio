-- Check which Supabase project you're connected to
-- Run this in both localhost and production to compare

-- Check current database name
SELECT current_database() as database_name;

-- Check current user
SELECT current_user as current_user;

-- Check if there are duplicate functions
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.oid
FROM pg_proc p
WHERE p.proname IN (
    'get_user_streaming_limit',
    'get_weekly_streaming_usage', 
    'add_streaming_minutes',
    'notify_streaming_limit_status'
)
ORDER BY p.proname, p.oid;

-- Check subscription plans
SELECT 'Subscription plans available:' as info;
SELECT id, name, streaming_minutes_limit FROM subscription_plans;

-- Check if livestream_weekly_usage table exists
SELECT 'Table structure:' as info;
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'livestream_weekly_usage'
ORDER BY ordinal_position;

