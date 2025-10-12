-- Fix Streaming Limit Email Notifications - Simple Version
-- This script creates a working notification system for streaming limit emails

-- ========================================
-- STEP 1: Clean up existing broken triggers (safe version)
-- ========================================

-- Drop existing triggers and functions safely
DO $$
BEGIN
    -- Drop trigger on livestreams table if it exists
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'streaming_limit_notification_trigger' AND tgrelid = 'public.livestreams'::regclass) THEN
        DROP TRIGGER streaming_limit_notification_trigger ON public.livestreams;
        RAISE NOTICE 'Dropped existing trigger on livestreams table';
    END IF;
    
    -- Drop function if it exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_streaming_limit_status') THEN
        DROP FUNCTION notify_streaming_limit_status();
        RAISE NOTICE 'Dropped existing notify_streaming_limit_status function';
    END IF;
END $$;

-- ========================================
-- STEP 2: Create streaming limit notifications table
-- ========================================

-- Create streaming limit notifications table
CREATE TABLE IF NOT EXISTS public.streaming_limit_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.verified_profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('warning', 'reached')),
    usage_percentage NUMERIC(5,2) NOT NULL,
    current_minutes INTEGER NOT NULL,
    limit_minutes INTEGER NOT NULL,
    remaining_minutes INTEGER NOT NULL,
    reset_date DATE NOT NULL,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_streaming_limit_notifications_user_id ON public.streaming_limit_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_streaming_limit_notifications_type ON public.streaming_limit_notifications(type);
CREATE INDEX IF NOT EXISTS idx_streaming_limit_notifications_processed ON public.streaming_limit_notifications(processed_at);
CREATE INDEX IF NOT EXISTS idx_streaming_limit_notifications_email_sent ON public.streaming_limit_notifications(email_sent);

-- ========================================
-- STEP 3: Create function to calculate weekly usage from livestreams
-- ========================================

CREATE OR REPLACE FUNCTION get_weekly_streaming_usage(user_id_param UUID, week_start_date DATE DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    usage_minutes INTEGER;
    target_week_start DATE;
BEGIN
    -- Use provided week_start_date or default to current week
    IF week_start_date IS NULL THEN
        target_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    ELSE
        target_week_start := week_start_date;
    END IF;
    
    -- Calculate usage from livestreams table directly
    SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
    ), 0)::INTEGER INTO usage_minutes
    FROM public.livestreams
    WHERE streamer_id = user_id_param
    AND status = 'ended'
    AND started_at IS NOT NULL
    AND ended_at IS NOT NULL
    AND DATE_TRUNC('week', started_at)::DATE = target_week_start;
    
    RETURN usage_minutes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 4: Create function to get user streaming limit
-- ========================================

CREATE OR REPLACE FUNCTION get_user_streaming_limit(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    limit_minutes INTEGER;
BEGIN
    -- Get user's streaming limit from subscription plan
    SELECT COALESCE(sp.streaming_minutes_limit, 0) INTO limit_minutes
    FROM public.verified_profiles vp
    LEFT JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
    WHERE vp.id = user_id_param;
    
    RETURN limit_minutes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 5: Create notification trigger function
-- ========================================

CREATE OR REPLACE FUNCTION check_and_create_streaming_limit_notifications()
RETURNS TRIGGER AS $$
DECLARE
    user_limit INTEGER;
    current_usage INTEGER;
    usage_percentage NUMERIC;
    remaining_minutes INTEGER;
    reset_date DATE;
    user_profile RECORD;
    existing_notification RECORD;
BEGIN
    -- Only process when a stream ends
    IF NEW.status = 'ended' AND (OLD.status IS NULL OR OLD.status != 'ended') THEN
        -- Get user's streaming limit
        user_limit := get_user_streaming_limit(NEW.streamer_id);
        
        -- Skip if no limit set
        IF user_limit <= 0 THEN
            RETURN NEW;
        END IF;
        
        -- Get current week's usage
        current_usage := get_weekly_streaming_usage(NEW.streamer_id);
        
        -- Calculate usage percentage
        usage_percentage := (current_usage::NUMERIC / user_limit::NUMERIC) * 100;
        remaining_minutes := GREATEST(0, user_limit - current_usage);
        
        -- Calculate reset date (next Monday)
        reset_date := DATE_TRUNC('week', CURRENT_DATE + INTERVAL '7 days')::DATE;
        
        -- Get user profile for email
        SELECT email, first_name INTO user_profile
        FROM public.verified_profiles
        WHERE id = NEW.streamer_id;
        
        -- Log the check
        RAISE NOTICE 'Streaming limit check - User: %, Usage: %/% (%), Reset: %', 
            NEW.streamer_id, current_usage, user_limit, ROUND(usage_percentage, 1), reset_date;
        
        -- Check for 75% warning threshold
        IF usage_percentage >= 75 AND usage_percentage < 100 THEN
            -- Check if we already sent a warning this week
            SELECT * INTO existing_notification
            FROM public.streaming_limit_notifications
            WHERE user_id = NEW.streamer_id
            AND type = 'warning'
            AND DATE_TRUNC('week', created_at)::DATE = DATE_TRUNC('week', CURRENT_DATE)::DATE;
            
            -- Only create notification if we haven't sent one this week
            IF existing_notification IS NULL THEN
                INSERT INTO public.streaming_limit_notifications (
                    user_id, type, usage_percentage, current_minutes, 
                    limit_minutes, remaining_minutes, reset_date
                ) VALUES (
                    NEW.streamer_id, 'warning', usage_percentage, current_usage,
                    user_limit, remaining_minutes, reset_date
                );
                
                RAISE NOTICE 'Created warning notification for user %', NEW.streamer_id;
            END IF;
        END IF;
        
        -- Check for 100% limit reached threshold
        IF usage_percentage >= 100 THEN
            -- Check if we already sent a limit reached notification this week
            SELECT * INTO existing_notification
            FROM public.streaming_limit_notifications
            WHERE user_id = NEW.streamer_id
            AND type = 'reached'
            AND DATE_TRUNC('week', created_at)::DATE = DATE_TRUNC('week', CURRENT_DATE)::DATE;
            
            -- Only create notification if we haven't sent one this week
            IF existing_notification IS NULL THEN
                INSERT INTO public.streaming_limit_notifications (
                    user_id, type, usage_percentage, current_minutes, 
                    limit_minutes, remaining_minutes, reset_date
                ) VALUES (
                    NEW.streamer_id, 'reached', usage_percentage, current_usage,
                    user_limit, 0, reset_date
                );
                
                RAISE NOTICE 'Created limit reached notification for user %', NEW.streamer_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 6: Create trigger on livestreams table
-- ========================================

-- Create trigger for streaming limit notifications
CREATE TRIGGER streaming_limit_notification_trigger
    AFTER UPDATE ON public.livestreams
    FOR EACH ROW
    EXECUTE FUNCTION check_and_create_streaming_limit_notifications();

-- ========================================
-- STEP 7: Create function to process pending notifications
-- ========================================

CREATE OR REPLACE FUNCTION process_pending_streaming_notifications()
RETURNS TABLE (
    notification_id UUID,
    user_id UUID,
    user_email TEXT,
    user_first_name TEXT,
    notification_type TEXT,
    usage_percentage NUMERIC,
    remaining_minutes INTEGER,
    reset_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sln.id,
        sln.user_id,
        vp.email,
        vp.first_name,
        sln.type,
        sln.usage_percentage,
        sln.remaining_minutes,
        sln.reset_date
    FROM public.streaming_limit_notifications sln
    JOIN public.verified_profiles vp ON sln.user_id = vp.id
    WHERE sln.email_sent = false
    AND sln.processed_at IS NULL
    ORDER BY sln.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 8: Create function to mark notification as processed
-- ========================================

CREATE OR REPLACE FUNCTION mark_notification_processed(
    notification_id_param UUID,
    email_sent_param BOOLEAN DEFAULT true
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.streaming_limit_notifications
    SET 
        processed_at = NOW(),
        email_sent = email_sent_param,
        email_sent_at = CASE WHEN email_sent_param THEN NOW() ELSE NULL END
    WHERE id = notification_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 9: Grant permissions
-- ========================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.streaming_limit_notifications TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_weekly_streaming_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_streaming_limit TO authenticated;
GRANT EXECUTE ON FUNCTION process_pending_streaming_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_processed TO authenticated;

-- ========================================
-- STEP 10: Test the system
-- ========================================

-- Test function to verify the system works
CREATE OR REPLACE FUNCTION test_streaming_limit_system(test_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    user_id UUID,
    current_usage INTEGER,
    limit_minutes INTEGER,
    usage_percentage NUMERIC,
    remaining_minutes INTEGER
) AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Use provided user ID or find a test user
    IF test_user_id IS NULL THEN
        SELECT id INTO target_user_id
        FROM public.verified_profiles
        WHERE subscription_plan_id IS NOT NULL
        LIMIT 1;
    ELSE
        target_user_id := test_user_id;
    END IF;
    
    -- Return usage data for the user
    RETURN QUERY
    SELECT 
        target_user_id,
        get_weekly_streaming_usage(target_user_id),
        get_user_streaming_limit(target_user_id),
        CASE 
            WHEN get_user_streaming_limit(target_user_id) > 0 THEN
                ROUND((get_weekly_streaming_usage(target_user_id)::NUMERIC / get_user_streaming_limit(target_user_id)::NUMERIC) * 100, 1)
            ELSE 0
        END,
        GREATEST(0, get_user_streaming_limit(target_user_id) - get_weekly_streaming_usage(target_user_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on test function
GRANT EXECUTE ON FUNCTION test_streaming_limit_system TO authenticated;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Streaming limit email notification system has been fixed!';
    RAISE NOTICE 'Created streaming_limit_notifications table';
    RAISE NOTICE 'Created proper trigger on livestreams table';
    RAISE NOTICE 'Created helper functions for usage calculation';
    RAISE NOTICE 'Created notification processing functions';
    RAISE NOTICE 'System is ready to send streaming limit email notifications';
END $$;
