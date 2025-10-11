-- Fix Weekly Usage Function Grants
-- This script adds the missing grants for the weekly usage functions

-- Grant execute permissions to authenticated users for get_weekly_usage
GRANT EXECUTE ON FUNCTION public.get_weekly_usage(UUID, DATE) TO authenticated;

-- Verify the grants exist
SELECT 
    'Function grants verification' as status,
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges 
WHERE routine_name IN ('get_weekly_usage', 'check_weekly_streaming_limit')
AND routine_schema = 'public'
ORDER BY routine_name, grantee;

-- Test the functions to make sure they work
-- (Replace with actual user ID for testing)
-- SELECT * FROM get_weekly_usage('your-user-id-here'::UUID, DATE_TRUNC('week', CURRENT_DATE)::DATE);
-- SELECT * FROM check_weekly_streaming_limit('your-user-id-here'::UUID);

SELECT 'Weekly usage function grants added successfully!' as result;
