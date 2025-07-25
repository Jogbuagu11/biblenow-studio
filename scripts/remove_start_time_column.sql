-- Remove start_time column from livestreams table
-- This column should not exist as it was removed in migration 011

-- First, check if start_time column exists
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'livestreams'
AND column_name = 'start_time';

-- Remove the start_time column if it exists
ALTER TABLE public.livestreams DROP COLUMN IF EXISTS start_time;

-- Verify the column was removed
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'livestreams'
AND column_name = 'start_time';

-- Show the updated table structure
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'livestreams'
ORDER BY ordinal_position; 