-- Fix livestreams table by removing problematic columns and triggers
-- Run this in your Supabase SQL Editor

-- 1. First, let's see what triggers exist on the livestreams table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'livestreams'
AND trigger_schema = 'public';

-- 2. Remove any triggers that might be causing issues
-- (We'll recreate them later if needed)
DROP TRIGGER IF EXISTS update_livestreams_updated_at ON public.livestreams;
DROP TRIGGER IF EXISTS trigger_endstream_redirect ON public.livestreams;

-- 3. Remove the start_time column that shouldn't exist
ALTER TABLE public.livestreams DROP COLUMN IF EXISTS start_time;

-- 4. Remove any functions that might be causing issues
DROP FUNCTION IF EXISTS update_livestreams_updated_at();
DROP FUNCTION IF EXISTS handle_endstream_redirect();
DROP FUNCTION IF EXISTS end_stream_by_id(UUID);

-- 5. Recreate the update_livestreams_updated_at function
CREATE OR REPLACE FUNCTION update_livestreams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Recreate the trigger for updated_at
CREATE TRIGGER update_livestreams_updated_at
  BEFORE UPDATE ON public.livestreams
  FOR EACH ROW
  EXECUTE FUNCTION update_livestreams_updated_at();

-- 7. Verify the table structure
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'livestreams'
ORDER BY ordinal_position;

-- 8. Check if there are any remaining triggers
SELECT 
    trigger_name,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'livestreams'
AND trigger_schema = 'public'; 