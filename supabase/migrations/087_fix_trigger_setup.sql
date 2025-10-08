-- Fix trigger setup - ensure it's properly attached and working

-- 1. Check current trigger status
SELECT 
    'Current Triggers' as status,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    action_condition
FROM information_schema.triggers 
WHERE event_object_table = 'livestream_weekly_usage';

-- 2. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS notify_streaming_limit_status_trigger ON public.livestream_weekly_usage;

-- 3. Ensure the trigger function exists and is correct
CREATE OR REPLACE FUNCTION notify_streaming_limit_status()
RETURNS TRIGGER AS $$
DECLARE
    user_limit INTEGER;
    current_usage INTEGER;
    usage_percentage NUMERIC;
    user_profile RECORD;
    next_week_start DATE;
BEGIN
    RAISE NOTICE 'TRIGGER FIRED for user % with % minutes', NEW.user_id, NEW.streamed_minutes;
    
    -- Get user's streaming limit and profile info
    SELECT 
        sp.streaming_minutes_limit,
        vp.email,
        vp.first_name
    INTO user_profile
    FROM public.verified_profiles vp
    JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
    WHERE vp.id = NEW.user_id;

    -- Skip if user profile not found
    IF user_profile IS NULL THEN
        RAISE NOTICE 'User profile not found for user %', NEW.user_id;
        RETURN NEW;
    END IF;

    user_limit := user_profile.streaming_minutes_limit;
    RAISE NOTICE 'User limit: % minutes', user_limit;

    -- Get current week's usage
    SELECT COALESCE(SUM(streamed_minutes), 0) INTO current_usage
    FROM public.livestream_weekly_usage
    WHERE user_id = NEW.user_id
    AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;

    -- Calculate percentage
    IF user_limit > 0 THEN
        usage_percentage := (current_usage::NUMERIC / user_limit::NUMERIC) * 100;
    ELSE
        usage_percentage := 0;
    END IF;

    -- Calculate next week's start date
    next_week_start := DATE_TRUNC('week', CURRENT_DATE + INTERVAL '7 days')::DATE;

    -- Log for debugging
    RAISE NOTICE 'User: %, Usage: %/% (% percent)', NEW.user_id, current_usage, user_limit, ROUND(usage_percentage, 1);

    -- Send notifications at thresholds (75% and 100%)
    IF usage_percentage >= 75 AND usage_percentage < 100 THEN
        RAISE NOTICE 'Creating 75 percent warning notification for user %', NEW.user_id;
        
        -- Check if we already have a warning notification for this week
        IF NOT EXISTS (
            SELECT 1 FROM public.studio_notifications 
            WHERE user_id = NEW.user_id 
            AND type = 'streaming_limit_warning'
            AND created_at >= DATE_TRUNC('week', CURRENT_DATE)
        ) THEN
            INSERT INTO public.studio_notifications (
                user_id,
                type,
                title,
                body,
                metadata,
                is_read,
                created_at
            ) VALUES (
                NEW.user_id,
                'streaming_limit_warning',
                'Approaching Weekly Streaming Limit',
                format('You have used %s%% of your weekly streaming limit (%s of %s minutes). Your limit will reset on %s.', 
                    ROUND(usage_percentage, 1),
                    current_usage,
                    user_limit,
                    next_week_start
                ),
                jsonb_build_object(
                    'usage_percentage', ROUND(usage_percentage, 1),
                    'current_minutes', current_usage,
                    'limit_minutes', user_limit,
                    'remaining_minutes', user_limit - current_usage,
                    'reset_date', next_week_start,
                    'email', user_profile.email,
                    'first_name', user_profile.first_name,
                    'notification_type', 'warning'
                ),
                false,
                NOW()
            );
            RAISE NOTICE 'Warning notification created successfully';
        ELSE
            RAISE NOTICE 'Warning notification already exists for this week';
        END IF;
    END IF;

    IF usage_percentage >= 100 THEN
        RAISE NOTICE 'Creating 100 percent limit reached notification for user %', NEW.user_id;
        
        -- Check if we already have a limit reached notification for this week
        IF NOT EXISTS (
            SELECT 1 FROM public.studio_notifications 
            WHERE user_id = NEW.user_id 
            AND type = 'streaming_limit_reached'
            AND created_at >= DATE_TRUNC('week', CURRENT_DATE)
        ) THEN
            INSERT INTO public.studio_notifications (
                user_id,
                type,
                title,
                body,
                metadata,
                is_read,
                created_at
            ) VALUES (
                NEW.user_id,
                'streaming_limit_reached',
                'Weekly Streaming Limit Reached',
                format('You have reached your weekly streaming limit. Your limit will reset on %s.', 
                    next_week_start
                ),
                jsonb_build_object(
                    'usage_percentage', ROUND(usage_percentage, 1),
                    'current_minutes', current_usage,
                    'limit_minutes', user_limit,
                    'remaining_minutes', 0,
                    'reset_date', next_week_start,
                    'email', user_profile.email,
                    'first_name', user_profile.first_name,
                    'notification_type', 'reached'
                ),
                false,
                NOW()
            );
            RAISE NOTICE 'Limit reached notification created successfully';
        ELSE
            RAISE NOTICE 'Limit reached notification already exists for this week';
        END IF;
    END IF;

    RAISE NOTICE 'TRIGGER COMPLETED for user %', NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the trigger with explicit events
CREATE TRIGGER notify_streaming_limit_status_trigger
    AFTER INSERT OR UPDATE OF streamed_minutes ON public.livestream_weekly_usage
    FOR EACH ROW
    EXECUTE FUNCTION notify_streaming_limit_status();

-- 5. Verify the trigger was created
SELECT 
    'New Trigger Status' as status,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    action_condition
FROM information_schema.triggers 
WHERE trigger_name = 'notify_streaming_limit_status_trigger'
AND event_object_table = 'livestream_weekly_usage';

-- 6. Test the trigger by updating a record
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a user from recent usage data
    SELECT user_id INTO test_user_id
    FROM public.livestream_weekly_usage 
    WHERE created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing trigger with user: %', test_user_id;
        
        -- Update the record to trigger the notification
        UPDATE public.livestream_weekly_usage 
        SET updated_at = NOW()
        WHERE user_id = test_user_id
        AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;
        
        RAISE NOTICE 'Trigger test update completed';
    ELSE
        RAISE NOTICE 'No recent usage data found for trigger test';
    END IF;
END $$;
