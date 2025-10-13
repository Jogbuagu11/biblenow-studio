-- First, let's see exactly what functions exist and their OIDs
-- This will help us understand what's causing the conflicts

-- Find ALL functions with these names and their exact signatures
SELECT 
    p.oid,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.prosrc as source_code,
    'DROP FUNCTION IF EXISTS ' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_statement
FROM pg_proc p
WHERE p.proname IN (
    'get_user_streaming_limit',
    'get_weekly_streaming_usage', 
    'add_streaming_minutes',
    'notify_streaming_limit_status',
    'sync_livestream_weekly_usage',
    'trigger_sync_livestream_weekly_usage'
)
ORDER BY p.proname, p.oid;
