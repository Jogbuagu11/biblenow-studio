-- Clean up all test streaming data added during development

DO $$
DECLARE
    test_user_id UUID := '29a4414e-d60f-42c1-bbfd-9166f17211a0';
    deleted_usage_count INTEGER;
    deleted_notifications_count INTEGER;
BEGIN
    RAISE NOTICE '🧹 Cleaning up test streaming data...';
    RAISE NOTICE '👤 Target user: %', test_user_id;
    
    -- 1. Delete test livestream weekly usage data
    DELETE FROM public.livestream_weekly_usage 
    WHERE user_id = test_user_id;
    
    GET DIAGNOSTICS deleted_usage_count = ROW_COUNT;
    RAISE NOTICE '✅ Deleted % livestream_weekly_usage records', deleted_usage_count;
    
    -- 2. Delete test notifications (streaming limit related)
    DELETE FROM public.studio_notifications 
    WHERE user_id = test_user_id
    AND type IN ('streaming_limit_warning', 'streaming_limit_reached');
    
    GET DIAGNOSTICS deleted_notifications_count = ROW_COUNT;
    RAISE NOTICE '✅ Deleted % streaming limit notifications', deleted_notifications_count;
    
    -- 3. Delete any other test notifications (with trigger_test metadata)
    DELETE FROM public.studio_notifications 
    WHERE user_id = test_user_id
    AND metadata->>'trigger_test' = 'true';
    
    GET DIAGNOSTICS deleted_notifications_count = ROW_COUNT;
    RAISE NOTICE '✅ Deleted % trigger test notifications', deleted_notifications_count;
    
    -- 4. Summary
    RAISE NOTICE '🎉 Cleanup completed successfully!';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '   - Streaming usage records: % deleted', deleted_usage_count;
    RAISE NOTICE '   - Test notifications: cleaned up';
    RAISE NOTICE '   - User account: preserved (only test data removed)';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error during cleanup: %', SQLERRM;
END $$;

-- Verify cleanup - show remaining data for this user
SELECT 
    'REMAINING USAGE DATA' as check_type,
    COUNT(*) as remaining_records,
    COALESCE(SUM(streamed_minutes), 0) as total_minutes
FROM public.livestream_weekly_usage 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0';

SELECT 
    'REMAINING NOTIFICATIONS' as check_type,
    COUNT(*) as remaining_notifications,
    array_agg(DISTINCT type) as notification_types
FROM public.studio_notifications 
WHERE user_id = '29a4414e-d60f-42c1-bbfd-9166f17211a0';

-- Show user profile is still intact
SELECT 
    'USER PROFILE STATUS' as check_type,
    id,
    email,
    first_name,
    subscription_plan_id
FROM public.verified_profiles 
WHERE id = '29a4414e-d60f-42c1-bbfd-9166f17211a0';

-- Final confirmation message
DO $$
BEGIN
    RAISE NOTICE '✨ Test data cleanup complete! User profile and subscription remain intact.';
END $$;
