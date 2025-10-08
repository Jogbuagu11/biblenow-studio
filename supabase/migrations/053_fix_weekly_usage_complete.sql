-- Comprehensive fix for weekly usage tracking
-- This migration ensures the table exists and updates all related functions

-- 1. Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.livestream_weekly_usage (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.verified_profiles(id) ON DELETE CASCADE,
    week_start_date date NOT NULL,
    streamed_minutes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, week_start_date)
);

-- 2. Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_livestream_weekly_usage_user_week 
ON public.livestream_weekly_usage(user_id, week_start_date);

-- 3. Update or create the weekly streaming limit check function
CREATE OR REPLACE FUNCTION public.check_weekly_streaming_limit(user_id_param UUID)
RETURNS TABLE (
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
    
    -- Set streaming limit based on plan
    CASE user_plan
        WHEN 'free' THEN plan_limit := 60; -- 1 hour per week
        WHEN 'basic' THEN plan_limit := 300; -- 5 hours per week
        WHEN 'pro' THEN plan_limit := 1200; -- 20 hours per week
        WHEN 'enterprise' THEN plan_limit := 3000; -- 50 hours per week
        ELSE plan_limit := 60; -- Default to free plan limit
    END CASE;
    
    -- Get current week's usage
    SELECT COALESCE(streamed_minutes, 0) INTO current_usage
    FROM public.livestream_weekly_usage
    WHERE user_id = user_id_param 
    AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Calculate remaining minutes and usage percentage
    IF plan_limit = 0 THEN
        -- Avoid division by zero
        RETURN QUERY SELECT 
            TRUE as has_reached_limit,
            COALESCE(current_usage, 0) as current_minutes,
            plan_limit as limit_minutes,
            0 as remaining_minutes,
            100::NUMERIC as usage_percentage;
    ELSE
        RETURN QUERY SELECT 
            COALESCE(current_usage, 0) >= plan_limit as has_reached_limit,
            COALESCE(current_usage, 0) as current_minutes,
            plan_limit as limit_minutes,
            GREATEST(0, plan_limit - COALESCE(current_usage, 0)) as remaining_minutes,
            LEAST(100, (COALESCE(current_usage, 0)::NUMERIC / plan_limit::NUMERIC * 100)::NUMERIC) as usage_percentage;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Grant necessary permissions
GRANT ALL ON TABLE public.livestream_weekly_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_weekly_streaming_limit TO authenticated;

-- 5. Enable RLS
ALTER TABLE public.livestream_weekly_usage ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
CREATE POLICY "Users can read their own weekly usage"
    ON public.livestream_weekly_usage
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly usage"
    ON public.livestream_weekly_usage
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly usage"
    ON public.livestream_weekly_usage
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 7. Test the function
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM public.verified_profiles LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test the function
        PERFORM * FROM check_weekly_streaming_limit(test_user_id);
        RAISE NOTICE 'Weekly streaming limit check function tested successfully';
    END IF;
END;
$$;
