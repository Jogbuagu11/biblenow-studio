-- Remove created_at column from livestreams table
-- This column is not needed and causes schema cache issues
ALTER TABLE public.livestreams DROP COLUMN IF EXISTS created_at;

-- Drop the index for created_at if it exists
DROP INDEX IF EXISTS idx_livestreams_created_at; 