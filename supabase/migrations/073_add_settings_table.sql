-- Create settings table
CREATE TABLE IF NOT EXISTS public.studio_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert required settings
INSERT INTO public.studio_settings (key, value, description)
VALUES 
    ('supabase_url', 'https://jhlawjmyorpmafokxtuh.supabase.co', 'Supabase project URL'),
    ('service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJobGF3am15b3JwbWFmb2t4dHVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwOTY2NTYwMCwiZXhwIjoyMDI1MjQxNjAwfQ.b350dd5e-7605-44dd-9084-4613ebe7bf99', 'Service role key for edge functions')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value,
    updated_at = NOW();

-- Update the trigger function to use the settings table
CREATE OR REPLACE FUNCTION notify_streaming_limit_status()
RETURNS TRIGGER AS $$
DECLARE
    user_limit INTEGER;
    current_usage INTEGER;
    usage_percentage NUMERIC;
    user_profile RECORD;
    next_week_start DATE;
    supabase_url TEXT;
    service_role_key TEXT;
BEGIN
    -- Get settings from the table
    SELECT value INTO supabase_url FROM public.studio_settings WHERE key = 'supabase_url';
    SELECT value INTO service_role_key FROM public.studio_settings WHERE key = 'service_role_key';

    -- Get user's streaming limit and profile info
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

    -- Calculate next week's start date
    next_week_start := DATE_TRUNC('week', CURRENT_DATE + INTERVAL '7 days')::DATE;

    -- Log the check for debugging
    RAISE NOTICE 'Streaming limit check - User: %, Current Usage: %, Limit: %, Usage Percentage: %', 
        NEW.user_id, 
        current_usage, 
        user_limit, 
        ROUND(usage_percentage, 1);

    -- Send notifications at thresholds
    IF usage_percentage >= 75 AND usage_percentage < 100 THEN
        -- Insert warning notification
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

        -- Call edge function to send warning email
        PERFORM net.http_post(
            url := CONCAT(supabase_url, '/functions/v1/send-streaming-limit-email'),
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', CONCAT('Bearer ', service_role_key)
            ),
            body := jsonb_build_object(
                'user_id', NEW.user_id,
                'email', user_profile.email,
                'first_name', user_profile.first_name,
                'type', 'warning',
                'usage_percentage', ROUND(usage_percentage, 1),
                'remaining_minutes', user_limit - current_usage,
                'reset_date', next_week_start
            )
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

        -- Call edge function to send limit reached email
        PERFORM net.http_post(
            url := CONCAT(supabase_url, '/functions/v1/send-streaming-limit-email'),
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', CONCAT('Bearer ', service_role_key)
            ),
            body := jsonb_build_object(
                'user_id', NEW.user_id,
                'email', user_profile.email,
                'first_name', user_profile.first_name,
                'type', 'reached',
                'usage_percentage', ROUND(usage_percentage, 1),
                'remaining_minutes', 0,
                'reset_date', next_week_start
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres;
GRANT EXECUTE ON FUNCTION net.http_post TO postgres;

-- Add RLS policies for settings table
ALTER TABLE public.studio_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users"
    ON public.studio_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- Grant permissions for settings table
GRANT SELECT ON public.studio_settings TO authenticated;
