-- Fix the weekly usage function to return a proper record type
CREATE OR REPLACE FUNCTION public.get_weekly_usage(user_id_param UUID, week_start_date_param DATE)
RETURNS TABLE (
    streamed_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT COALESCE(lw.streamed_minutes, 0)::INTEGER as streamed_minutes
    FROM (SELECT user_id_param as user_id) u
    LEFT JOIN public.livestream_weekly_usage lw ON lw.user_id = u.user_id 
        AND lw.week_start_date::DATE = week_start_date_param::DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
