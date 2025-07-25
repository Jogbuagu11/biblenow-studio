-- Function to reset all users' weekly usage
CREATE OR REPLACE FUNCTION public.reset_weekly_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.weekly_usage
  SET streamed_minutes = 0,
      week_start_date = CURRENT_DATE,
      updated_at = now();
END;
$$ LANGUAGE plpgsql; 