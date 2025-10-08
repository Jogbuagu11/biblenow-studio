-- Create a function to track and notify about streaming limits
CREATE OR REPLACE FUNCTION notify_streaming_limit_status()
RETURNS TRIGGER AS $$
DECLARE
    user_limit INTEGER;
    current_usage INTEGER;
    usage_percentage NUMERIC;
    user_profile RECORD;
BEGIN
    -- Get user's streaming limit
    SELECT sp.streaming_minutes_limit INTO user_limit
    FROM public.verified_profiles vp
    JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
    WHERE vp.id = NEW.user_id;

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

    -- Get user profile info
    SELECT vp.* INTO user_profile
    FROM public.verified_profiles vp
    WHERE vp.id = NEW.user_id;

    -- Check if we should send notifications
    IF usage_percentage >= 75 AND usage_percentage < 100 THEN
        -- Insert warning notification
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            body,
            is_read,
            metadata
        ) VALUES (
            NEW.user_id,
            'streaming_limit_warning',
            'Approaching Weekly Streaming Limit',
            format('You have used %s%% of your weekly streaming limit. Consider upgrading your plan for more streaming time.', 
                   ROUND(usage_percentage::numeric, 1)),
            false,
            jsonb_build_object(
                'usage_percentage', ROUND(usage_percentage::numeric, 1),
                'current_minutes', current_usage,
                'limit_minutes', user_limit,
                'remaining_minutes', user_limit - current_usage
            )
        );

        -- Trigger email notification
        PERFORM databaseService.sendStreamingLimitEmails(NEW.user_id);
    END IF;

    IF usage_percentage >= 100 THEN
        -- Insert limit reached notification
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            body,
            is_read,
            metadata
        ) VALUES (
            NEW.user_id,
            'streaming_limit_reached',
            'Weekly Streaming Limit Reached',
            'You have reached your weekly streaming limit. Please wait until next week or upgrade your plan to continue streaming.',
            false,
            jsonb_build_object(
                'usage_percentage', ROUND(usage_percentage::numeric, 1),
                'current_minutes', current_usage,
                'limit_minutes', user_limit,
                'remaining_minutes', 0
            )
        );

        -- Trigger email notification
        PERFORM databaseService.sendStreamingLimitEmails(NEW.user_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for streaming limit notifications
DROP TRIGGER IF EXISTS streaming_limit_notification_trigger ON public.livestream_weekly_usage;
CREATE TRIGGER streaming_limit_notification_trigger
    AFTER INSERT OR UPDATE OF streamed_minutes
    ON public.livestream_weekly_usage
    FOR EACH ROW
    EXECUTE FUNCTION notify_streaming_limit_status();

-- Add index to improve performance
CREATE INDEX IF NOT EXISTS idx_livestream_weekly_usage_user_week 
ON public.livestream_weekly_usage (user_id, week_start_date);

-- Update RLS policies to allow trigger function to work
ALTER POLICY "Enable read access for all users" ON public.notifications USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.livestream_weekly_usage TO service_role;
