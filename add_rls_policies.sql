-- Add RLS policies for livestream_weekly_usage table

-- Enable Row Level Security
ALTER TABLE public.livestream_weekly_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own weekly usage
CREATE POLICY "Users can view own weekly usage" ON public.livestream_weekly_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own weekly usage
CREATE POLICY "Users can insert own weekly usage" ON public.livestream_weekly_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own weekly usage
CREATE POLICY "Users can update own weekly usage" ON public.livestream_weekly_usage
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can do everything (for triggers and functions)
CREATE POLICY "Service role full access" ON public.livestream_weekly_usage
    FOR ALL USING (auth.role() = 'service_role');

SELECT 'RLS policies added successfully!' as status;
