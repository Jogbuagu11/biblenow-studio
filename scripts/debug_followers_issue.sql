-- Debug script to identify why followers are showing as "Unknown User"
-- Run this in your Supabase SQL editor to diagnose the issue

-- 1. Check if user_follows table exists and has data
SELECT 'user_follows table check' as step;
SELECT COUNT(*) as total_follows FROM user_follows;
SELECT * FROM user_follows LIMIT 5;

-- 2. Check verified_profiles table structure
SELECT 'verified_profiles structure check' as step;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'verified_profiles' 
AND column_name IN ('id', 'first_name', 'last_name', 'email', 'profile_photo_url')
ORDER BY ordinal_position;

-- 3. Check if there are any verified_profiles with missing names
SELECT 'profiles with missing names check' as step;
SELECT id, email, first_name, last_name, profile_photo_url
FROM verified_profiles 
WHERE first_name IS NULL OR last_name IS NULL
LIMIT 10;

-- 4. Check the actual data in verified_profiles
SELECT 'sample verified_profiles data' as step;
SELECT id, email, first_name, last_name, profile_photo_url
FROM verified_profiles 
LIMIT 5;

-- 5. Test the exact query that getFollowers uses
SELECT 'testing getFollowers query logic' as step;

-- First, get a sample user to test with
WITH sample_user AS (
  SELECT id FROM verified_profiles LIMIT 1
)
-- Then test the followers query for that user
SELECT 
  uf.follower_id,
  uf.following_id,
  uf.created_at,
  vp.first_name,
  vp.last_name,
  vp.email,
  vp.profile_photo_url
FROM user_follows uf
LEFT JOIN verified_profiles vp ON uf.follower_id = vp.id
CROSS JOIN sample_user su
WHERE uf.following_id = su.id
ORDER BY uf.created_at DESC;

-- 6. Check for any orphaned follows (follower_id not in verified_profiles)
SELECT 'orphaned follows check' as step;
SELECT uf.follower_id, uf.following_id, uf.created_at
FROM user_follows uf
LEFT JOIN verified_profiles vp ON uf.follower_id = vp.id
WHERE vp.id IS NULL;

-- 7. Check for any orphaned follows (following_id not in verified_profiles)
SELECT 'orphaned following check' as step;
SELECT uf.follower_id, uf.following_id, uf.created_at
FROM user_follows uf
LEFT JOIN verified_profiles vp ON uf.following_id = vp.id
WHERE vp.id IS NULL; 