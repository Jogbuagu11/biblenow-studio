-- Create livestream_weekly_usage table and trigger system
-- This table tracks weekly streaming usage for each user

-- 1. Create the livestream_weekly_usage table
CREATE TABLE IF NOT EXISTS public.livestream_weekly_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.verified_profiles(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    streamed_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user per week
    UNIQUE(user_id, week_start_date)
);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_livestream_weekly_usage_user_week 
ON public.livestream_weekly_usage(user_id, week_start_date);

-- 3. Create function to get or create weekly usage record
CREATE OR REPLACE FUNCTION get_or_create_weekly_usage(
    p_user_id UUID,
    p_week_start DATE DEFAULT DATE_TRUNC('week', CURRENT_DATE)::DATE
) RETURNS UUID AS $$
DECLARE
    usage_id UUID;
BEGIN
    -- Try to get existing record
    SELECT id INTO usage_id
    FROM public.livestream_weekly_usage
    WHERE user_id = p_user_id 
    AND week_start_date = p_week_start;
    
    -- Create if doesn't exist
    IF usage_id IS NULL THEN
        INSERT INTO public.livestream_weekly_usage (user_id, week_start_date, streamed_minutes)
        VALUES (p_user_id, p_week_start, 0)
        RETURNING id INTO usage_id;
    END IF;
    
    RETURN usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to add streaming minutes
CREATE OR REPLACE FUNCTION add_streaming_minutes(
    p_user_id UUID,
    p_minutes INTEGER,
    p_week_start DATE DEFAULT DATE_TRUNC('week', CURRENT_DATE)::DATE
) RETURNS VOID AS $$
DECLARE
    usage_id UUID;
BEGIN
    -- Get or create weekly usage record
    usage_id := get_or_create_weekly_usage(p_user_id, p_week_start);
    
    -- Add minutes to existing total
    UPDATE public.livestream_weekly_usage
    SET 
        streamed_minutes = streamed_minutes + p_minutes,
        updated_at = NOW()
    WHERE id = usage_id;
    
    RAISE NOTICE 'Added % minutes to user % for week %', p_minutes, p_user_id, p_week_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to get user's streaming limit
CREATE OR REPLACE FUNCTION get_user_streaming_limit(p_user_id UUID) 
RETURNS INTEGER AS $$
DECLARE
    user_limit INTEGER;
BEGIN
    SELECT sp.streaming_minutes_limit INTO user_limit
    FROM public.verified_profiles vp
    JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
    WHERE vp.id = p_user_id;
    
    RETURN COALESCE(user_limit, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to get current week's usage
CREATE OR REPLACE FUNCTION get_weekly_streaming_usage(p_user_id UUID) 
RETURNS INTEGER AS $$
DECLARE
    current_usage INTEGER;
BEGIN
    SELECT COALESCE(streamed_minutes, 0) INTO current_usage
    FROM public.livestream_weekly_usage
    WHERE user_id = p_user_id
    AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    RETURN COALESCE(current_usage, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create the trigger function for streaming limit notifications
CREATE OR REPLACE FUNCTION notify_streaming_limit_status()
RETURNS TRIGGER AS $$
DECLARE
    user_limit INTEGER;
    current_usage INTEGER;
    usage_percentage NUMERIC;
    user_profile RECORD;
    next_week_start DATE;
BEGIN
    -- Get user's streaming limit
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
            RAISE NOTICE 'Warning notification created';
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
            RAISE NOTICE 'Limit reached notification created';
        ELSE
            RAISE NOTICE 'Limit reached notification already exists for this week';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create the trigger
DROP TRIGGER IF EXISTS notify_streaming_limit_status_trigger ON public.livestream_weekly_usage;
CREATE TRIGGER notify_streaming_limit_status_trigger
    AFTER INSERT OR UPDATE OF streamed_minutes
    ON public.livestream_weekly_usage
    FOR EACH ROW
    EXECUTE FUNCTION notify_streaming_limit_status();

-- 9. Test the system
SELECT 'livestream_weekly_usage table and trigger system created successfully!' as status;
