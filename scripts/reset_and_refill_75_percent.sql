-- Reset and refill 75% usage test script
-- This script clears existing usage and notifications, then adds exactly 75% usage to test warnings

DO $$
DECLARE
    streamer_id UUID := '29a4414e-d60f-42c1-bbfd-9166f17211a0';
    current_week_start DATE;
    usage_minutes INTEGER := 900; -- 75% of 1200 minutes (Cedar plan limit)
BEGIN
    -- Calculate current week start (Monday)
    current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    RAISE NOTICE 'Resetting usage for user % for week starting %', streamer_id, current_week_start;
    
    -- 1. Clear existing weekly usage for this user and week
    DELETE FROM public.livestream_weekly_usage
    WHERE user_id = streamer_id
    AND week_start_date = current_week_start;
    
    RAISE NOTICE 'Cleared existing usage records';
    
    -- 2. Clear existing notifications for this user
    DELETE FROM public.studio_notifications
    WHERE user_id = streamer_id;
    
    RAISE NOTICE 'Cleared existing notifications';
    
    -- 3. Insert exactly 75% usage (900 minutes for Cedar plan)
    INSERT INTO public.livestream_weekly_usage (
        user_id,
        week_start_date,
        streamed_minutes,
        created_at,
        updated_at
    ) VALUES (
        streamer_id,
        current_week_start,
        usage_minutes,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Inserted % minutes of usage (75 percent of limit)', usage_minutes;
    
END $$;

-- Verify the setup
SELECT 
    'Current Usage' as check_type,
    user_id,
    week_start_date,
    streamed_minutes,
    created_at
FROM public.livestream_weekly_usage 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;

-- Check streaming limit calculation
SELECT 
    'Limit Check' as check_type,
    *
FROM check_weekly_streaming_limit('29a4414e-d60f-42c1-bbfd-9166f17211a0');

-- Check notifications created
SELECT 
    'Notifications' as check_type,
    id,
    user_id,
    type,
    title,
    body,
    is_read,
    processed_at,
    created_at,
    metadata->>'usage_percentage' as usage_percentage,
    metadata->>'notification_type' as notification_type
FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
ORDER BY created_at DESC;
