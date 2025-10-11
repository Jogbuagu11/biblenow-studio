-- Drop Weekly Usage Table and All Related Components
-- This script completely removes the weekly usage tracking system

-- ========================================
-- STEP 1: Drop all triggers first
-- ========================================

-- Drop all weekly usage related triggers
DROP TRIGGER IF EXISTS trigger_update_weekly_usage_on_livestream_end ON public.livestreams;
DROP TRIGGER IF EXISTS trigger_livestream_weekly_usage ON public.livestreams;
DROP TRIGGER IF EXISTS livestream_weekly_usage_trigger ON public.livestreams;
DROP TRIGGER IF EXISTS update_weekly_usage_trigger ON public.livestreams;
DROP TRIGGER IF EXISTS weekly_usage_trigger ON public.livestreams;
DROP TRIGGER IF EXISTS trigger_update_livestream_weekly_usage_on_stream_end ON public.livestreams;
DROP TRIGGER IF EXISTS livestream_activity_trigger ON public.livestreams;
DROP TRIGGER IF EXISTS livestream_status_trigger ON public.livestreams;
DROP TRIGGER IF EXISTS livestream_update_trigger ON public.livestreams;

-- Drop notification triggers related to weekly usage
DROP TRIGGER IF EXISTS notify_streaming_limit_status_trigger ON public.livestream_weekly_usage;
DROP TRIGGER IF EXISTS streaming_limit_notification_trigger ON public.livestream_weekly_usage;

-- ========================================
-- STEP 2: Drop all functions
-- ========================================

-- Drop weekly usage functions
DROP FUNCTION IF EXISTS update_weekly_usage_on_livestream_end() CASCADE;
DROP FUNCTION IF EXISTS update_livestream_weekly_usage_on_stream_end() CASCADE;
DROP FUNCTION IF EXISTS update_weekly_usage_on_stream_end() CASCADE;
DROP FUNCTION IF EXISTS handle_weekly_usage_update() CASCADE;
DROP FUNCTION IF EXISTS calculate_weekly_usage() CASCADE;
DROP FUNCTION IF EXISTS update_stream_weekly_stats() CASCADE;
DROP FUNCTION IF EXISTS handle_livestream_activity() CASCADE;
DROP FUNCTION IF EXISTS handle_livestream_activity_safe() CASCADE;
DROP FUNCTION IF EXISTS handle_livestream_activity_simple() CASCADE;

-- Drop helper functions
DROP FUNCTION IF EXISTS get_week_start_date(TIMESTAMP WITH TIME ZONE) CASCADE;
DROP FUNCTION IF EXISTS calculate_stream_duration_minutes(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) CASCADE;

-- Drop utility functions
DROP FUNCTION IF EXISTS update_user_weekly_usage(UUID, DATE, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_user_weekly_usage(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS sync_user_weekly_usage(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS sync_all_users_weekly_usage() CASCADE;

-- Drop application functions
DROP FUNCTION IF EXISTS get_weekly_usage(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS check_weekly_streaming_limit(UUID) CASCADE;

-- Drop notification functions
DROP FUNCTION IF EXISTS notify_streaming_limit_status() CASCADE;

-- ========================================
-- STEP 3: Drop the table
-- ========================================

-- Drop the weekly usage table (this will also drop all indexes and constraints)
DROP TABLE IF EXISTS public.livestream_weekly_usage CASCADE;

-- ========================================
-- STEP 4: Verify cleanup
-- ========================================

-- Check if any triggers remain
SELECT 
    'Remaining Triggers' as check_type,
    trigger_name,
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'livestreams'
AND trigger_name LIKE '%weekly%'
UNION ALL
SELECT 
    'Remaining Triggers' as check_type,
    trigger_name,
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'livestream_weekly_usage';

-- Check if any functions remain
SELECT 
    'Remaining Functions' as check_type,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND (
    routine_name LIKE '%weekly%' 
    OR routine_name LIKE '%usage%'
    OR routine_name LIKE '%streaming_limit%'
);

-- Check if table exists
SELECT 
    'Table Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'livestream_weekly_usage'
        ) THEN 'Table still exists'
        ELSE 'Table successfully dropped'
    END as status;

-- ========================================
-- STEP 5: Final status
-- ========================================

SELECT 
    'Weekly usage system completely removed!' as status,
    'All triggers dropped' as triggers,
    'All functions dropped' as functions,
    'Table dropped' as table_status,
    'You can now implement a new system' as next_steps;
