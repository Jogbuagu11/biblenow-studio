-- Create table to track weekly streaming usage per user
CREATE TABLE IF NOT EXISTS public.weekly_usage (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.verified_profiles(id),
    week_start_date date NOT NULL, -- Start of the week (e.g., Monday)
    streamed_minutes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, week_start_date)
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_weekly_usage_user_week ON public.weekly_usage(user_id, week_start_date); 