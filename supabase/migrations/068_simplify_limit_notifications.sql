-- Function to handle streaming limit email notifications
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

    -- Send email notifications at thresholds
    IF usage_percentage >= 75 OR usage_percentage >= 100 THEN
        -- Send email notification
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
