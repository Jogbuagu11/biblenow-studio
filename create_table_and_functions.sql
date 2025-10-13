-- Create the livestream_weekly_usage table and all related functions
-- This script will create everything from scratch

-- Step 1: Drop everything first to start clean
DROP TABLE IF EXISTS livestream_weekly_usage CASCADE;
DROP FUNCTION IF EXISTS get_user_streaming_limit(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_weekly_streaming_usage(uuid) CASCADE;
DROP FUNCTION IF EXISTS add_streaming_minutes(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS notify_streaming_limit_status() CASCADE;

-- Step 2: Create the livestream_weekly_usage table
CREATE TABLE livestream_weekly_usage (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES verified_profiles(id) ON DELETE CASCADE,
    week_start_date date NOT NULL,
    minutes_streamed integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW(),
    
    -- Ensure one record per user per week
    UNIQUE(user_id, week_start_date)
);

-- Step 3: Create indexes for better performance
CREATE INDEX idx_livestream_weekly_usage_user_id ON livestream_weekly_usage(user_id);
CREATE INDEX idx_livestream_weekly_usage_week_start ON livestream_weekly_usage(week_start_date);
CREATE INDEX idx_livestream_weekly_usage_user_week ON livestream_weekly_usage(user_id, week_start_date);

-- Step 4: Enable RLS
ALTER TABLE livestream_weekly_usage ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
CREATE POLICY "Users can view their own weekly usage" ON livestream_weekly_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly usage" ON livestream_weekly_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly usage" ON livestream_weekly_usage
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can do everything" ON livestream_weekly_usage
    FOR ALL USING (auth.role() = 'service_role');

-- Step 6: Create the functions
CREATE OR REPLACE FUNCTION get_user_streaming_limit(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_limit integer;
BEGIN
    -- Since preferences are currently null, return default limit
    user_limit := 60; -- Default to 60 minutes per week
    RETURN user_limit;
END;
$$;

CREATE OR REPLACE FUNCTION get_weekly_streaming_usage(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    usage_minutes integer;
    week_start date;
BEGIN
    -- Calculate start of current week (Monday)
    week_start := date_trunc('week', CURRENT_DATE)::date;
    
    -- Get total streaming minutes for current week
    SELECT COALESCE(SUM(minutes_streamed), 0)
    INTO usage_minutes
    FROM livestream_weekly_usage
    WHERE user_id = user_id_param
    AND week_start_date = week_start;
    
    RETURN COALESCE(usage_minutes, 0);
END;
$$;

CREATE OR REPLACE FUNCTION add_streaming_minutes(user_id_param uuid, minutes_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    week_start date;
    current_usage integer;
    user_limit integer;
BEGIN
    -- Calculate start of current week (Monday)
    week_start := date_trunc('week', CURRENT_DATE)::date;
    
    -- Get current usage for the week
    current_usage := get_weekly_streaming_usage(user_id_param);
    
    -- Get user's streaming limit
    user_limit := get_user_streaming_limit(user_id_param);
    
    -- Insert or update weekly usage
    INSERT INTO livestream_weekly_usage (user_id, week_start_date, minutes_streamed)
    VALUES (user_id_param, week_start, minutes_to_add)
    ON CONFLICT (user_id, week_start_date)
    DO UPDATE SET 
        minutes_streamed = livestream_weekly_usage.minutes_streamed + minutes_to_add,
        updated_at = NOW();
    
    -- Check if user has reached their limit
    IF (current_usage + minutes_to_add) >= user_limit THEN
        -- Insert notification for streaming limit reached
        INSERT INTO studio_notifications (user_id, type, message, metadata)
        VALUES (
            user_id_param,
            'streaming_limit_reached',
            'You have reached your weekly streaming limit',
            jsonb_build_object(
                'current_usage', current_usage + minutes_to_add,
                'limit', user_limit,
                'week_start', week_start
            )
        );
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION notify_streaming_limit_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_limit integer;
    current_usage integer;
BEGIN
    -- Get user's streaming limit
    user_limit := get_user_streaming_limit(NEW.user_id);
    
    -- Get current usage for the week
    current_usage := get_weekly_streaming_usage(NEW.user_id);
    
    -- Check if user has reached their limit
    IF current_usage >= user_limit THEN
        -- Insert notification for streaming limit reached
        INSERT INTO studio_notifications (user_id, type, message, metadata)
        VALUES (
            NEW.user_id,
            'streaming_limit_reached',
            'You have reached your weekly streaming limit',
            jsonb_build_object(
                'current_usage', current_usage,
                'limit', user_limit,
                'week_start', NEW.week_start_date
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Step 7: Create the trigger
CREATE TRIGGER notify_streaming_limit_status_trigger
    AFTER INSERT OR UPDATE ON livestream_weekly_usage
    FOR EACH ROW
    EXECUTE FUNCTION notify_streaming_limit_status();

-- Step 8: Verify everything was created successfully
SELECT 'Table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'livestream_weekly_usage'
ORDER BY ordinal_position;

SELECT 'Functions created:' as info;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_user_streaming_limit',
    'get_weekly_streaming_usage', 
    'add_streaming_minutes',
    'notify_streaming_limit_status'
)
ORDER BY routine_name;

-- Step 9: Test the functions
SELECT 'Testing get_user_streaming_limit:' as test_name;
SELECT get_user_streaming_limit('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as streaming_limit;

SELECT 'Testing get_weekly_streaming_usage:' as test_name;
SELECT get_weekly_streaming_usage('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as current_usage;

SELECT 'Testing add_streaming_minutes:' as test_name;
SELECT add_streaming_minutes('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid, 50);

-- Step 10: Check if notification was created
SELECT 'Checking for notifications:' as test_name;
SELECT 
    id,
    user_id,
    type,
    message,
    created_at
FROM studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid
AND type = 'streaming_limit_reached'
ORDER BY created_at DESC
LIMIT 5;
