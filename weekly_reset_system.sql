-- Weekly Reset System and Subscription Tracking
-- This script implements global weekly resets and subscription start date tracking

-- ========================================
-- STEP 1: Add subscription start date to verified_profiles
-- ========================================

-- Add subscription start date column if it doesn't exist
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add subscription renewal date for monthly billing
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS subscription_renewal_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 month';

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_verified_profiles_subscription_start ON public.verified_profiles(subscription_start_date);
CREATE INDEX IF NOT EXISTS idx_verified_profiles_subscription_renewal ON public.verified_profiles(subscription_renewal_date);

-- ========================================
-- STEP 2: Create weekly reset tracking table
-- ========================================

CREATE TABLE IF NOT EXISTS public.weekly_reset_log (
    id SERIAL PRIMARY KEY,
    reset_date DATE NOT NULL,
    reset_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    users_affected INTEGER DEFAULT 0,
    reset_type VARCHAR(50) DEFAULT 'weekly',
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_weekly_reset_log_date ON public.weekly_reset_log(reset_date);


-- ========================================
-- STEP 3: Create weekly reset function
-- ========================================

CREATE OR REPLACE FUNCTION perform_weekly_reset()
RETURNS TABLE(
    reset_date DATE,
    users_processed INTEGER,
    status TEXT
) AS $$
DECLARE
    current_monday DATE;
    users_count INTEGER := 0;
    reset_record RECORD;
BEGIN
    -- Get the current Monday (start of week)
    current_monday := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    RAISE NOTICE '🔄 Starting weekly reset for week beginning %', current_monday;
    
    -- Check if reset already performed for this week
    SELECT * INTO reset_record
    FROM public.weekly_reset_log
    WHERE reset_date = current_monday
    AND status = 'completed';
    
    IF reset_record IS NOT NULL THEN
        RAISE NOTICE '⚠️ Weekly reset already performed for week beginning %', current_monday;
        RETURN QUERY SELECT current_monday, 0, 'already_completed';
        RETURN;
    END IF;
    
    -- Count active users (users with subscription plans)
    SELECT COUNT(*) INTO users_count
    FROM public.verified_profiles
    WHERE subscription_plan IS NOT NULL
    AND subscription_plan != 'free';
    
    RAISE NOTICE '📊 Found % users with active subscriptions', users_count;
    
    -- Log the reset attempt
    INSERT INTO public.weekly_reset_log (
        reset_date,
        users_affected,
        reset_type,
        status,
        notes
    ) VALUES (
        current_monday,
        users_count,
        'weekly',
        'in_progress',
        'Weekly streaming limits reset for ' || users_count || ' users'
    );
    
    -- Note: Since we're using direct calculation from livestreams table,
    -- the "reset" happens automatically when the week changes.
    -- This function mainly serves as a logging mechanism and can be
    -- extended for other weekly reset operations.
    
    -- Update the reset log to completed
    UPDATE public.weekly_reset_log
    SET status = 'completed',
        notes = notes || ' - Reset completed successfully'
    WHERE reset_date = current_monday
    AND status = 'in_progress';
    
    RAISE NOTICE '✅ Weekly reset completed for week beginning %', current_monday;
    
    RETURN QUERY SELECT current_monday, users_count, 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 4: Create subscription management functions
-- ========================================

-- Function to update subscription start date when user subscribes
CREATE OR REPLACE FUNCTION update_subscription_start_date(
    user_id_param UUID,
    subscription_plan_param VARCHAR(50),
    start_date_param TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.verified_profiles
    SET 
        subscription_start_date = start_date_param,
        subscription_renewal_date = start_date_param + INTERVAL '1 month',
        subscription_plan = subscription_plan_param,
        updated_at = NOW()
    WHERE id = user_id_param;
    
    RAISE NOTICE '📅 Updated subscription start date for user % to %', user_id_param, start_date_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get subscription status and next billing date
CREATE OR REPLACE FUNCTION get_subscription_status(user_id_param UUID)
RETURNS TABLE(
    user_id UUID,
    subscription_plan VARCHAR(50),
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_renewal_date TIMESTAMP WITH TIME ZONE,
    days_until_renewal INTEGER,
    is_active BOOLEAN
) AS $$
DECLARE
    days_until INTEGER;
BEGIN
    RETURN QUERY
    SELECT 
        vp.id,
        vp.subscription_plan,
        vp.subscription_start_date,
        vp.subscription_renewal_date,
        EXTRACT(DAYS FROM (vp.subscription_renewal_date - NOW()))::INTEGER as days_until_renewal,
        (vp.subscription_renewal_date > NOW()) as is_active
    FROM public.verified_profiles vp
    WHERE vp.id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 5: Create automated weekly reset trigger
-- ========================================

-- Function to check if weekly reset is needed
CREATE OR REPLACE FUNCTION check_weekly_reset()
RETURNS VOID AS $$
DECLARE
    current_monday DATE;
    last_reset DATE;
BEGIN
    current_monday := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Check if we've already reset for this week
    SELECT reset_date INTO last_reset
    FROM public.weekly_reset_log
    WHERE reset_date = current_monday
    AND status = 'completed'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no reset for this week, perform it
    IF last_reset IS NULL THEN
        RAISE NOTICE '🔄 No reset found for week beginning %, performing reset', current_monday;
        PERFORM perform_weekly_reset();
    ELSE
        RAISE NOTICE '✅ Reset already performed for week beginning %', current_monday;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 6: Grant permissions
-- ========================================

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION perform_weekly_reset() TO authenticated;
GRANT EXECUTE ON FUNCTION update_subscription_start_date(UUID, VARCHAR(50), TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_weekly_reset() TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON public.weekly_reset_log TO authenticated;

-- ========================================
-- STEP 7: Create RLS policies
-- ========================================

-- Enable RLS on weekly_reset_log
ALTER TABLE public.weekly_reset_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reset logs
CREATE POLICY "Users can view reset logs" ON public.weekly_reset_log
    FOR SELECT USING (true);


-- ========================================
-- STEP 8: Test the system
-- ========================================

-- Test the weekly reset function
-- SELECT * FROM perform_weekly_reset();

-- Test subscription status function (replace with actual user ID)
-- SELECT * FROM get_subscription_status('your-user-id-here'::UUID);

-- ========================================
-- STEP 9: Final status
-- ========================================

SELECT 
    'Weekly reset system created successfully!' as status,
    'Added subscription_start_date and subscription_renewal_date columns' as subscription_tracking,
    'Created weekly_reset_log table' as reset_logging,
    'Created perform_weekly_reset() function' as reset_function,
    'Created subscription management functions' as subscription_functions,
    'System ready for Monday 12am streaming resets' as next_steps;
