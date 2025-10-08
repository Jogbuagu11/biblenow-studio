-- Fix the weekly usage query to handle date comparisons correctly
CREATE OR REPLACE FUNCTION public.get_weekly_usage(user_id_param UUID, week_start_date_param DATE)
RETURNS TABLE (
    streamed_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT COALESCE(streamed_minutes, 0) as streamed_minutes
    FROM public.livestream_weekly_usage
    WHERE user_id = user_id_param 
    AND week_start_date::DATE = week_start_date_param::DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
