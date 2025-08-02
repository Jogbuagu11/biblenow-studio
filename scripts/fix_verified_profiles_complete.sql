-- Comprehensive fix for verified_profiles table
-- This script ensures all required columns exist

-- First, let's check what columns currently exist
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'verified_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add missing columns one by one

-- Role column removed - all verified profiles are users

-- Status column removed - all verified profiles are considered active

-- 3. Add profile_photo_url column if it doesn't exist
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- 4. Add ministry_name column if it doesn't exist
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS ministry_name VARCHAR(255);

-- 5. Add first_name column if it doesn't exist
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);

-- 6. Add last_name column if it doesn't exist
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);

-- 7. Add email column if it doesn't exist
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_verified_profiles_email ON public.verified_profiles(email);

-- No status updates needed - all verified profiles are considered active

-- Show final schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'verified_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position; 