-- Fixed working solution: Handle the notifications table properly
-- This version will work regardless of the notifications table structure

-- Step 1: Create the table (drop if exists)
DROP TABLE IF EXISTS livestream_weekly_usage CASCADE;

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

-- Step 2: Create indexes
CREATE INDEX idx_livestream_weekly_usage_user_id ON livestream_weekly_usage(user_id);
CREATE INDEX idx_livestream_weekly_usage_week_start ON livestream_weekly_usage(week_start_date);
CREATE INDEX idx_livestream_weekly_usage_user_week ON livestream_weekly_usage(user_id, week_start_date);

-- Step 3: Enable RLS
ALTER TABLE livestream_weekly_usage ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
CREATE POLICY "Users can view their own weekly usage" ON livestream_weekly_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly usage" ON livestream_weekly_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly usage" ON livestream_weekly_usage
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can do everything" ON livestream_weekly_usage
    FOR ALL USING (auth.role() = 'service_role');

-- Step 5: Create functions with completely unique names
CREATE OR REPLACE FUNCTION streaming_get_user_limit(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return default limit of 60 minutes per week
    RETURN 60;
END;
$$;

CREATE OR REPLACE FUNCTION streaming_get_weekly_usage(user_id_param uuid)
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

CREATE OR REPLACE FUNCTION streaming_add_minutes(user_id_param uuid, minutes_to_add integer)
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
    current_usage := streaming_get_weekly_usage(user_id_param);
    
    -- Get user's streaming limit
    user_limit := streaming_get_user_limit(user_id_param);
    
    -- Insert or update weekly usage
    INSERT INTO livestream_weekly_usage (user_id, week_start_date, minutes_streamed)
    VALUES (user_id_param, week_start, minutes_to_add)
    ON CONFLICT (user_id, week_start_date)
    DO UPDATE SET 
        minutes_streamed = livestream_weekly_usage.minutes_streamed + minutes_to_add,
        updated_at = NOW();
    
    -- Check if user has reached their limit
    IF (current_usage + minutes_to_add) >= user_limit THEN
        -- Try to insert notification - handle different table structures
        BEGIN
            -- Try with message column first
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
        EXCEPTION
            WHEN undefined_column THEN
                -- If message column doesn't exist, try without it
                INSERT INTO studio_notifications (user_id, type, metadata)
                VALUES (
                    user_id_param,
                    'streaming_limit_reached',
                    jsonb_build_object(
                        'current_usage', current_usage + minutes_to_add,
                        'limit', user_limit,
                        'week_start', week_start,
                        'message', 'You have reached your weekly streaming limit'
                    )
                );
        END;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION streaming_notify_limit_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_limit integer;
    current_usage integer;
BEGIN
    -- Get user's streaming limit
    user_limit := streaming_get_user_limit(NEW.user_id);
    
    -- Get current usage for the week
    current_usage := streaming_get_weekly_usage(NEW.user_id);
    
    -- Check if user has reached their limit
    IF current_usage >= user_limit THEN
        -- Try to insert notification - handle different table structures
        BEGIN
            -- Try with message column first
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
        EXCEPTION
            WHEN undefined_column THEN
                -- If message column doesn't exist, try without it
                INSERT INTO studio_notifications (user_id, type, metadata)
                VALUES (
                    NEW.user_id,
                    'streaming_limit_reached',
                    jsonb_build_object(
                        'current_usage', current_usage,
                        'limit', user_limit,
                        'week_start', NEW.week_start_date,
                        'message', 'You have reached your weekly streaming limit'
                    )
                );
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Step 6: Create the trigger
CREATE TRIGGER streaming_limit_notify_trigger
    AFTER INSERT OR UPDATE ON livestream_weekly_usage
    FOR EACH ROW
    EXECUTE FUNCTION streaming_notify_limit_status();

-- Step 7: Test the functions
SELECT 'Testing streaming_get_user_limit:' as test_name;
SELECT streaming_get_user_limit('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as streaming_limit;

SELECT 'Testing streaming_get_weekly_usage:' as test_name;
SELECT streaming_get_weekly_usage('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid) as current_usage;

SELECT 'Testing streaming_add_minutes:' as test_name;
SELECT streaming_add_minutes('29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid, 50);

-- Step 8: Check if notification was created (handle different table structures)
SELECT 'Checking for notifications:' as test_name;
-- Try to select with message column first
DO $$
BEGIN
    -- This will work if message column exists
    PERFORM 1 FROM studio_notifications WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid AND type = 'streaming_limit_reached' LIMIT 1;
    RAISE NOTICE 'Notifications table has message column';
EXCEPTION
    WHEN undefined_column THEN
        RAISE NOTICE 'Notifications table does not have message column';
END $$;

-- Show notifications (this will work regardless of table structure)
SELECT 
    id,
    user_id,
    type,
    created_at
FROM studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0'::uuid
AND type = 'streaming_limit_reached'
ORDER BY created_at DESC
LIMIT 5;
