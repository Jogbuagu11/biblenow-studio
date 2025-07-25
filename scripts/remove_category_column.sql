-- Remove category column from livestreams table
-- Run this in your Supabase SQL Editor to remove the category column

-- First, let's see the current table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'livestreams'
ORDER BY ordinal_position;

-- Check if category column exists
SELECT COUNT(*) as category_column_exists
FROM information_schema.columns
WHERE table_name = 'livestreams' AND column_name = 'category';

-- Remove the category column if it exists
ALTER TABLE public.livestreams DROP COLUMN IF EXISTS category;

-- Verify the column was removed
SELECT COUNT(*) as category_column_remains
FROM information_schema.columns
WHERE table_name = 'livestreams' AND column_name = 'category';

-- Show the updated table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'livestreams'
ORDER BY ordinal_position; 