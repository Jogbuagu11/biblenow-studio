-- Create separate tables for web and mobile notifications
CREATE TABLE IF NOT EXISTS public.web_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.verified_profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mobile_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.verified_profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Mobile specific fields
    notification_token TEXT,
    platform VARCHAR(20), -- 'ios' or 'android'
    deep_link TEXT
);

-- Function to send notifications to both platforms
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
        -- Insert web notification
        INSERT INTO public.web_notifications (
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

        -- Insert mobile notification
        INSERT INTO public.mobile_notifications (
            user_id,
            type,
            title,
            body,
            is_read,
            metadata,
            deep_link
        ) VALUES (
            NEW.user_id,
            'streaming_limit_warning',
            'Weekly Streaming Limit Warning',
            format('You have used %s%% of your weekly streaming limit', 
                   ROUND(usage_percentage::numeric, 1)),
            false,
            jsonb_build_object(
                'usage_percentage', ROUND(usage_percentage::numeric, 1),
                'current_minutes', current_usage,
                'limit_minutes', user_limit,
                'remaining_minutes', user_limit - current_usage
            ),
            'biblenow://settings/subscription'
        );

        -- Trigger email notification
        PERFORM databaseService.sendStreamingLimitEmails(NEW.user_id);
    END IF;

    IF usage_percentage >= 100 THEN
        -- Insert web notification
        INSERT INTO public.web_notifications (
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

        -- Insert mobile notification
        INSERT INTO public.mobile_notifications (
            user_id,
            type,
            title,
            body,
            is_read,
            metadata,
            deep_link
        ) VALUES (
            NEW.user_id,
            'streaming_limit_reached',
            'Weekly Streaming Limit Reached',
            'You''ve reached your weekly streaming limit. Upgrade your plan to continue streaming.',
            false,
            jsonb_build_object(
                'usage_percentage', ROUND(usage_percentage::numeric, 1),
                'current_minutes', current_usage,
                'limit_minutes', user_limit,
                'remaining_minutes', 0
            ),
            'biblenow://settings/subscription'
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_web_notifications_user_type 
ON public.web_notifications (user_id, type);

CREATE INDEX IF NOT EXISTS idx_mobile_notifications_user_type 
ON public.mobile_notifications (user_id, type);

-- Update RLS policies
ALTER TABLE public.web_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own notifications
CREATE POLICY "Users can read their own web notifications"
ON public.web_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own mobile notifications"
ON public.mobile_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.web_notifications TO service_role;
GRANT ALL ON public.mobile_notifications TO service_role;
