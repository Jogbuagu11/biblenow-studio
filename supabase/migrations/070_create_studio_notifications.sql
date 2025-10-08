-- Create studio notifications table
CREATE TABLE IF NOT EXISTS public.studio_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.verified_profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_studio_notifications_user_type 
ON public.studio_notifications (user_id, type);

-- Add RLS policies
ALTER TABLE public.studio_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own studio notifications"
    ON public.studio_notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Update the streaming limit notification function to use studio_notifications
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

    -- Calculate next week's start date for notification
    next_week_start := DATE_TRUNC('week', CURRENT_DATE + INTERVAL '7 days')::DATE;

    -- Log the check for debugging
    RAISE NOTICE 'Streaming limit check - User: %, Current Usage: %, Limit: %, Usage Percentage: %', 
        NEW.user_id, 
        current_usage, 
        user_limit, 
        ROUND(usage_percentage, 1);

    -- Send notifications at thresholds
    IF usage_percentage >= 75 AND usage_percentage < 100 THEN
        -- Insert warning notification for 75% usage
        INSERT INTO public.studio_notifications (
            user_id,
            type,
            title,
            body,
            metadata,
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
                'reset_date', next_week_start
            ),
            NOW()
        );
    END IF;

    IF usage_percentage >= 100 THEN
        -- Insert limit reached notification
        INSERT INTO public.studio_notifications (
            user_id,
            type,
            title,
            body,
            metadata,
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
                'reset_date', next_week_start
            ),
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS streaming_limit_notification_trigger ON public.livestream_weekly_usage;
CREATE TRIGGER streaming_limit_notification_trigger
    AFTER INSERT OR UPDATE OF streamed_minutes
    ON public.livestream_weekly_usage
    FOR EACH ROW
    EXECUTE FUNCTION notify_streaming_limit_status();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.studio_notifications TO authenticated;
