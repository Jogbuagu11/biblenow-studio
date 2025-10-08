-- Ensure the trigger is properly attached to the livestream_weekly_usage table

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS notify_streaming_limit_status_trigger ON public.livestream_weekly_usage;

-- Create the trigger on INSERT and UPDATE
CREATE TRIGGER notify_streaming_limit_status_trigger
    AFTER INSERT OR UPDATE ON public.livestream_weekly_usage
    FOR EACH ROW
    EXECUTE FUNCTION notify_streaming_limit_status();

-- Verify the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'notify_streaming_limit_status_trigger'
AND event_object_table = 'livestream_weekly_usage';
