-- Drop existing subscription_plans table if it exists
DROP TABLE IF EXISTS public.subscription_plans;

-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    streaming_minutes_limit INTEGER NOT NULL,
    price_usd DECIMAL(10,2) NOT NULL,
    features JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert subscription plans
INSERT INTO public.subscription_plans (name, streaming_minutes_limit, price_usd, features) VALUES
    ('Free', 0, 0.00, '["Basic streaming features"]'),
    ('Olive', 180, 9.99, '["3 hours weekly streaming", "Basic analytics", "Chat support"]'),
    ('Branch', 360, 19.99, '["6 hours weekly streaming", "Advanced analytics", "Priority support"]'),
    ('Vine', 600, 29.99, '["10 hours weekly streaming", "Premium analytics", "24/7 support"]'),
    ('Cedar', 1200, 49.99, '["20 hours weekly streaming", "Enterprise analytics", "Dedicated support"]');

-- Add subscription_plan_id to verified_profiles if it doesn't exist
ALTER TABLE public.verified_profiles 
    ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES public.subscription_plans(id);

-- Update the check_weekly_streaming_limit function to use subscription_plans table
CREATE OR REPLACE FUNCTION public.check_weekly_streaming_limit(user_id_param UUID)
RETURNS TABLE (
    has_reached_limit BOOLEAN,
    current_minutes INTEGER,
    limit_minutes INTEGER,
    remaining_minutes INTEGER,
    usage_percentage NUMERIC
) AS $$
DECLARE
    plan_limit INTEGER;
    current_usage INTEGER;
    week_start_date DATE;
BEGIN
    -- Get the start of the current week (Monday)
    week_start_date := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Get user's streaming limit from subscription plan
    SELECT sp.streaming_minutes_limit INTO plan_limit
    FROM public.verified_profiles vp
    JOIN public.subscription_plans sp ON vp.subscription_plan_id = sp.id
    WHERE vp.id = user_id_param;

    -- If no plan found, default to 0 (no streaming)
    IF plan_limit IS NULL THEN
        plan_limit := 0;
    END IF;
    
    -- Get current week's usage
    SELECT COALESCE(streamed_minutes, 0) INTO current_usage
    FROM public.livestream_weekly_usage
    WHERE user_id = user_id_param 
    AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;

    -- Default to 0 if no usage record found
    IF current_usage IS NULL THEN
        current_usage := 0;
    END IF;
    
    -- Calculate remaining minutes and usage percentage
    RETURN QUERY SELECT 
        current_usage >= plan_limit AS has_reached_limit,
        current_usage AS current_minutes,
        plan_limit AS limit_minutes,
        GREATEST(0, plan_limit - current_usage) AS remaining_minutes,
        CASE 
            WHEN plan_limit > 0 THEN 
                ROUND((current_usage::NUMERIC / plan_limit::NUMERIC) * 100, 1)
            ELSE 
                0
        END AS usage_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate existing users to new subscription plan IDs
WITH plan_mapping AS (
    SELECT id, name FROM public.subscription_plans
)
UPDATE public.verified_profiles vp
SET subscription_plan_id = pm.id
FROM plan_mapping pm
WHERE LOWER(vp.subscription_plan) = LOWER(pm.name);

-- Add RLS policies for subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow public read access to subscription plans
CREATE POLICY "Public can read subscription plans" 
ON public.subscription_plans
FOR SELECT 
USING (true);

-- Allow admins full access to subscription plans
CREATE POLICY "Admins can manage subscription plans" 
ON public.subscription_plans
FOR ALL 
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');
