-- Add scheduled_at column for future streams and remove start_time
ALTER TABLE public.livestreams ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
DROP INDEX IF EXISTS idx_livestreams_start_time;
ALTER TABLE public.livestreams DROP COLUMN IF EXISTS start_time;

-- Create index for scheduled_at
CREATE INDEX IF NOT EXISTS idx_livestreams_scheduled_at ON public.livestreams(scheduled_at); 