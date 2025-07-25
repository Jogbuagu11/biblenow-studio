-- Fix UUID format issue in verified_profiles table
-- Run this in your Supabase SQL Editor to fix the UUID format problem

-- First, let's see what IDs we currently have
SELECT id, email, first_name, last_name
FROM public.verified_profiles
ORDER BY created_at;

-- Check if there are any non-UUID IDs
SELECT COUNT(*) as non_uuid_count
FROM public.verified_profiles
WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Show the problematic IDs
SELECT id, email
FROM public.verified_profiles
WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Fix the UUID format issue
-- Option 1: Update existing non-UUID IDs to proper UUIDs
UPDATE public.verified_profiles
SET id = gen_random_uuid()
WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Option 2: If you want to keep the existing IDs but fix the format, you can convert them
-- This is more complex and depends on the current format
-- UPDATE public.verified_profiles
-- SET id = '00000000-0000-0000-0000-' || LPAD(SUBSTRING(id FROM '[0-9]+$'), 12, '0')
-- WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Verify the fix
SELECT COUNT(*) as remaining_non_uuid_count
FROM public.verified_profiles
WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Show the updated IDs
SELECT id, email, first_name, last_name
FROM public.verified_profiles
ORDER BY created_at; 