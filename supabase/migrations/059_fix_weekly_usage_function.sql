-- Drop and recreate the function with a simpler implementation
DROP FUNCTION IF EXISTS public.get_weekly_usage;

CREATE OR REPLACE FUNCTION public.get_weekly_usage(
    user_id_param UUID,
    week_start_date_param DATE
) RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    -- Get the weekly usage or default to 0
    SELECT jsonb_build_object(
        'streamed_minutes',
        COALESCE(
            (SELECT streamed_minutes 
             FROM public.livestream_weekly_usage 
             WHERE user_id = user_id_param 
             AND week_start_date::DATE = week_start_date_param::DATE),
            0
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
