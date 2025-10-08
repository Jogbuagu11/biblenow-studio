-- Add test functions that can bypass RLS for testing purposes

-- Function to create test streaming usage data
CREATE OR REPLACE FUNCTION create_test_streaming_usage(
    test_user_id UUID,
    usage_minutes INTEGER DEFAULT 900
)
RETURNS JSON AS $$
DECLARE
    current_week_start DATE;
    result JSON;
BEGIN
    -- Calculate current week start (Monday)
    current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Clear existing usage for this user and week
    DELETE FROM public.livestream_weekly_usage
    WHERE user_id = test_user_id
    AND week_start_date = current_week_start;
    
    -- Clear existing notifications for this user
    DELETE FROM public.studio_notifications
    WHERE user_id = test_user_id
    AND type IN ('streaming_limit_warning', 'streaming_limit_reached');
    
    -- Insert test usage data
    INSERT INTO public.livestream_weekly_usage (
        user_id,
        week_start_date,
        streamed_minutes,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        current_week_start,
        usage_minutes,
        NOW(),
        NOW()
    );
    
    -- Return success result
    result := json_build_object(
        'success', true,
        'user_id', test_user_id,
        'week_start_date', current_week_start,
        'usage_minutes', usage_minutes,
        'message', 'Test data created successfully'
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- Return error result
    result := json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to create test data'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get test results
CREATE OR REPLACE FUNCTION get_test_results(test_user_id UUID)
RETURNS JSON AS $$
DECLARE
    usage_data RECORD;
    limit_data RECORD;
    notifications_data JSON;
    result JSON;
BEGIN
    -- Get usage data
    SELECT * INTO usage_data
    FROM public.livestream_weekly_usage
    WHERE user_id = test_user_id
    AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Get limit calculation
    SELECT * INTO limit_data
    FROM check_weekly_streaming_limit(test_user_id);
    
    -- Get notifications
    SELECT json_agg(
        json_build_object(
            'id', id,
            'type', type,
            'title', title,
            'created_at', created_at,
            'processed_at', processed_at,
            'usage_percentage', metadata->>'usage_percentage',
            'notification_type', metadata->>'notification_type'
        )
    ) INTO notifications_data
    FROM public.studio_notifications
    WHERE user_id = test_user_id
    AND type IN ('streaming_limit_warning', 'streaming_limit_reached')
    AND created_at > NOW() - INTERVAL '5 minutes';
    
    -- Build result
    result := json_build_object(
        'usage_data', row_to_json(usage_data),
        'limit_data', row_to_json(limit_data),
        'notifications', COALESCE(notifications_data, '[]'::json),
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_test_streaming_usage(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_test_results(UUID) TO authenticated;
