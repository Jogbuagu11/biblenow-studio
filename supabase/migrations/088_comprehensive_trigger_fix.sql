-- Comprehensive trigger fix - ensure trigger is working properly

-- 1. Drop existing trigger and function completely
DROP TRIGGER IF EXISTS notify_streaming_limit_status_trigger ON public.livestream_weekly_usage;
DROP TRIGGER IF EXISTS streaming_limit_notification_trigger ON public.livestream_weekly_usage;
DROP FUNCTION IF EXISTS notify_streaming_limit_status();

-- 2. Create the trigger function with comprehensive logging
CREATE OR REPLACE FUNCTION notify_streaming_limit_status()
RETURNS TRIGGER AS $$
DECLARE
    user_limit INTEGER;
    current_usage INTEGER;
    usage_percentage NUMERIC;
    user_profile RECORD;
    next_week_start DATE;
    notification_id UUID;
BEGIN
    -- Log that trigger fired
    RAISE NOTICE '🔥 TRIGGER FIRED! User: %, Minutes: %, Operation: %', 
        NEW.user_id, NEW.streamed_minutes, TG_OP;
    
    -- Get user's streaming limit and profile info from verified_profiles
    SELECT 
        sp.streaming_minutes_limit,
        vp.email,
        vp.first_name
    INTO user_profile
    FROM public.verified_profiles vp
    JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
    WHERE vp.id = NEW.user_id;

    -- Check if user profile found
    IF user_profile IS NULL THEN
        RAISE NOTICE '❌ User profile not found for user %', NEW.user_id;
        RETURN NEW;
    END IF;

    user_limit := user_profile.streaming_minutes_limit;
    RAISE NOTICE '📊 User limit: % minutes, Email: %, Name: %', 
        user_limit, user_profile.email, user_profile.first_name;

    -- Get current week's total usage (sum all entries for this week)
    SELECT COALESCE(SUM(streamed_minutes), 0) INTO current_usage
    FROM public.livestream_weekly_usage
    WHERE user_id = NEW.user_id
    AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;

    RAISE NOTICE '📈 Current usage: % minutes', current_usage;

    -- Calculate percentage
    IF user_limit > 0 THEN
        usage_percentage := (current_usage::NUMERIC / user_limit::NUMERIC) * 100;
    ELSE
        usage_percentage := 0;
    END IF;

    -- Calculate next week's start date
    next_week_start := DATE_TRUNC('week', CURRENT_DATE + INTERVAL '7 days')::DATE;

    -- Log calculation results
    RAISE NOTICE '🧮 Usage calculation: %/% = % percent', 
        current_usage, user_limit, ROUND(usage_percentage, 1);

    -- Create notifications at thresholds
    IF usage_percentage >= 75 AND usage_percentage < 100 THEN
        RAISE NOTICE '⚠️ Creating WARNING notification (75%% threshold)';
        
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
            FORMAT('You have used %s%% of your weekly streaming limit (%s of %s minutes). Your limit will reset on %s.',
                ROUND(usage_percentage, 1), current_usage, user_limit, next_week_start),
            jsonb_build_object(
                'notification_type', 'warning',
                'usage_percentage', ROUND(usage_percentage, 1),
                'current_minutes', current_usage,
                'limit_minutes', user_limit,
                'remaining_minutes', user_limit - current_usage,
                'reset_date', next_week_start,
                'email', user_profile.email,
                'first_name', user_profile.first_name
            ),
            false,
            NOW()
        ) RETURNING id INTO notification_id;
        
        RAISE NOTICE '✅ Warning notification created: %', notification_id;
        
    ELSIF usage_percentage >= 100 THEN
        RAISE NOTICE '🚫 Creating LIMIT REACHED notification (100%% threshold)';
        
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
            FORMAT('You have reached your weekly streaming limit (%s of %s minutes). Your limit will reset on %s. Upgrade your plan to continue streaming.',
                current_usage, user_limit, next_week_start),
            jsonb_build_object(
                'notification_type', 'reached',
                'usage_percentage', ROUND(usage_percentage, 1),
                'current_minutes', current_usage,
                'limit_minutes', user_limit,
                'remaining_minutes', 0,
                'reset_date', next_week_start,
                'email', user_profile.email,
                'first_name', user_profile.first_name
            ),
            false,
            NOW()
        ) RETURNING id INTO notification_id;
        
        RAISE NOTICE '✅ Limit reached notification created: %', notification_id;
    ELSE
        RAISE NOTICE 'ℹ️ No notification needed (% percent usage)', ROUND(usage_percentage, 1);
    END IF;

    RAISE NOTICE '🏁 Trigger function completed successfully';
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '💥 Error in trigger function: %', SQLERRM;
        RETURN NEW; -- Don't fail the original operation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger with explicit events
CREATE TRIGGER notify_streaming_limit_status_trigger
    AFTER INSERT OR UPDATE OF streamed_minutes
    ON public.livestream_weekly_usage
    FOR EACH ROW
    EXECUTE FUNCTION notify_streaming_limit_status();

-- 4. Verify trigger was created
SELECT 
    'TRIGGER VERIFICATION' as status,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'livestream_weekly_usage'
AND trigger_schema = 'public';

-- 5. Test the trigger immediately
DO $$
DECLARE
    test_user_id UUID := '29a4414e-d60f-42c1-bbfd-9166f17211a0';
    current_week_start DATE;
BEGIN
    -- Calculate current week start (Monday)
    current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    RAISE NOTICE '🧪 IMMEDIATE TRIGGER TEST';
    RAISE NOTICE '🧪 Test user: %', test_user_id;
    RAISE NOTICE '🧪 Week start: %', current_week_start;
    
    -- Clear existing data
    DELETE FROM public.livestream_weekly_usage
    WHERE user_id = test_user_id
    AND week_start_date = current_week_start;
    
    DELETE FROM public.studio_notifications
    WHERE user_id = test_user_id;
    
    RAISE NOTICE '🧹 Cleared existing data';
    
    -- Insert test data - this should fire the trigger
    RAISE NOTICE '🚀 Inserting test data to fire trigger...';
    
    INSERT INTO public.livestream_weekly_usage (
        user_id,
        week_start_date,
        streamed_minutes,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        current_week_start,
        900, -- 75% of 1200 minutes
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ Test data inserted - trigger should have fired above';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error during immediate test: %', SQLERRM;
END $$;

-- 6. Show results
SELECT 
    'TEST RESULTS' as status,
    COUNT(*) as notification_count,
    array_agg(type) as notification_types
FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'
AND created_at > NOW() - INTERVAL '1 minute';
