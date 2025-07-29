-- Add email preferences to verified_profiles table
-- Run this in your Supabase SQL Editor

-- 1. Update the preferences JSONB field to include email settings
-- This will set default values for existing users
UPDATE public.verified_profiles 
SET preferences = COALESCE(preferences, '{}'::jsonb) || '{"streamingLimitEmails": true}'::jsonb
WHERE preferences IS NULL OR preferences->>'streamingLimitEmails' IS NULL;

-- 2. Create a function to check if user has reached their weekly limit
CREATE OR REPLACE FUNCTION public.check_weekly_streaming_limit(user_id_param UUID)
RETURNS TABLE(
    has_reached_limit BOOLEAN,
    current_minutes INTEGER,
    limit_minutes INTEGER,
    remaining_minutes INTEGER,
    usage_percentage NUMERIC
) AS $$
DECLARE
    user_plan VARCHAR(50);
    plan_limit INTEGER;
    current_usage INTEGER;
    week_start_date DATE;
BEGIN
    -- Get the start of the current week (Monday)
    week_start_date := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Get user's subscription plan and limit
    SELECT subscription_plan INTO user_plan
    FROM public.verified_profiles
    WHERE id = user_id_param;
    
    -- Get the streaming minutes limit based on plan
    SELECT streaming_minutes_limit INTO plan_limit
    FROM public.subscription_plans sp
    JOIN public.verified_profiles vp ON sp.name = vp.subscription_plan
    WHERE vp.id = user_id_param;
    
    -- If no plan limit found, default to 0 (unlimited)
    IF plan_limit IS NULL THEN
        plan_limit := 0;
    END IF;
    
    -- Get current weekly usage
    SELECT COALESCE(streamed_minutes, 0) INTO current_usage
    FROM public.weekly_usage
    WHERE user_id = user_id_param 
    AND week_start_date = week_start_date;
    
    -- Calculate remaining minutes and usage percentage
    IF plan_limit = 0 THEN
        -- Unlimited plan
        RETURN QUERY SELECT 
            FALSE as has_reached_limit,
            current_usage as current_minutes,
            plan_limit as limit_minutes,
            0 as remaining_minutes,
            0.0 as usage_percentage;
    ELSE
        -- Limited plan
        RETURN QUERY SELECT 
            (current_usage >= plan_limit) as has_reached_limit,
            current_usage as current_minutes,
            plan_limit as limit_minutes,
            GREATEST(0, plan_limit - current_usage) as remaining_minutes,
            CASE 
                WHEN plan_limit > 0 THEN (current_usage::NUMERIC / plan_limit::NUMERIC) * 100
                ELSE 0
            END as usage_percentage;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a function to send streaming limit emails
CREATE OR REPLACE FUNCTION public.send_streaming_limit_email(
    user_id_param UUID,
    email_type VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    user_email VARCHAR(255);
    user_first_name VARCHAR(255);
    reset_date DATE;
    current_minutes INTEGER;
    limit_minutes INTEGER;
    remaining_minutes INTEGER;
    usage_percentage NUMERIC;
    email_preferences JSONB;
    should_send_email BOOLEAN;
BEGIN
    -- Get user's email preferences
    SELECT preferences INTO email_preferences
    FROM public.verified_profiles
    WHERE id = user_id_param;
    
    -- Check if user has opted out of streaming limit emails
    should_send_email := COALESCE((email_preferences->>'streamingLimitEmails')::BOOLEAN, TRUE);
    
    IF NOT should_send_email THEN
        RETURN FALSE;
    END IF;
    
    -- Get user details
    SELECT email, first_name INTO user_email, user_first_name
    FROM public.verified_profiles
    WHERE id = user_id_param;
    
    -- Calculate next week's start date (reset date)
    reset_date := DATE_TRUNC('week', CURRENT_DATE)::DATE + INTERVAL '7 days';
    
    -- Get current usage and limits
    SELECT 
        current_minutes,
        limit_minutes,
        remaining_minutes,
        usage_percentage
    INTO 
        current_minutes,
        limit_minutes,
        remaining_minutes,
        usage_percentage
    FROM public.check_weekly_streaming_limit(user_id_param);
    
    -- Send email based on type
    IF email_type = 'warning' AND usage_percentage >= 75 AND usage_percentage < 100 THEN
        -- Send warning email at 75%
        -- This would integrate with your email service (Resend)
        RAISE NOTICE 'Sending weekly streaming limit warning email to %', user_email;
        RETURN TRUE;
    ELSIF email_type = 'reached' AND usage_percentage >= 100 THEN
        -- Send limit reached email at 100%
        RAISE NOTICE 'Sending weekly streaming limit reached email to %', user_email;
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a function to check and send limit emails
CREATE OR REPLACE FUNCTION public.check_and_send_limit_emails(user_id_param UUID)
RETURNS TABLE(
    warning_sent BOOLEAN,
    reached_sent BOOLEAN
) AS $$
DECLARE
    usage_data RECORD;
    warning_sent BOOLEAN := FALSE;
    reached_sent BOOLEAN := FALSE;
BEGIN
    -- Get usage data
    SELECT * INTO usage_data
    FROM public.check_weekly_streaming_limit(user_id_param);
    
    -- Check if we should send warning email (75% threshold)
    IF usage_data.usage_percentage >= 75 AND usage_data.usage_percentage < 100 THEN
        warning_sent := public.send_streaming_limit_email(user_id_param, 'warning');
    END IF;
    
    -- Check if we should send limit reached email (100% threshold)
    IF usage_data.usage_percentage >= 100 THEN
        reached_sent := public.send_streaming_limit_email(user_id_param, 'reached');
    END IF;
    
    RETURN QUERY SELECT warning_sent, reached_sent;
END;
$$ LANGUAGE plpgsql;

-- 5. Create a trigger to check limits when weekly usage is updated
CREATE OR REPLACE FUNCTION public.check_limits_on_usage_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check when streamed_minutes is updated
    IF OLD.streamed_minutes IS DISTINCT FROM NEW.streamed_minutes THEN
        -- Check and send limit emails
        PERFORM public.check_and_send_limit_emails(NEW.user_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger on weekly_usage table
DROP TRIGGER IF EXISTS trigger_check_limits_on_usage_update ON public.weekly_usage;
CREATE TRIGGER trigger_check_limits_on_usage_update
    AFTER UPDATE ON public.weekly_usage
    FOR EACH ROW
    EXECUTE FUNCTION public.check_limits_on_usage_update();

-- 7. Test the functions
SELECT 
    'Test weekly limit check' as test_step,
    vp.email,
    vp.subscription_plan,
    (public.check_weekly_streaming_limit(vp.id)).*
FROM public.verified_profiles vp
LIMIT 5;

-- 8. Show current email preferences
SELECT 
    'Email preferences' as test_step,
    email,
    preferences->>'streamingLimitEmails' as streaming_limit_emails_enabled
FROM public.verified_profiles
ORDER BY email; 