-- Remove fake verified profiles that are causing "Unknown User" to appear
-- This will clean up any profiles with missing names

-- 1. First, let's see what fake profiles exist
SELECT 'Fake verified profiles to be removed:' as info;
SELECT 
  id,
  email,
  first_name,
  last_name,
  ministry_name,
  created_at
FROM verified_profiles 
WHERE first_name IS NULL OR last_name IS NULL;

-- 2. Check if any of these fake profiles are being followed
SELECT 'Follows involving fake profiles:' as info;
SELECT 
  uf.follower_id,
  uf.following_id,
  uf.created_at,
  'Fake profile involved' as note
FROM user_follows uf
WHERE uf.follower_id IN (
  SELECT id FROM verified_profiles WHERE first_name IS NULL OR last_name IS NULL
) OR uf.following_id IN (
  SELECT id FROM verified_profiles WHERE first_name IS NULL OR last_name IS NULL
);

-- 3. Remove follows involving fake profiles
DELETE FROM user_follows 
WHERE follower_id IN (
  SELECT id FROM verified_profiles WHERE first_name IS NULL OR last_name IS NULL
) OR following_id IN (
  SELECT id FROM verified_profiles WHERE first_name IS NULL OR last_name IS NULL
);

-- 4. Remove the fake verified profiles
DELETE FROM verified_profiles 
WHERE first_name IS NULL OR last_name IS NULL;

-- 5. Verify the cleanup
SELECT 'Verification - remaining verified profiles:' as info;
SELECT COUNT(*) as total_profiles FROM verified_profiles;

SELECT 'Verification - remaining follows:' as info;
SELECT COUNT(*) as total_follows FROM user_follows;

-- 6. Show remaining verified profiles
SELECT 'Remaining verified profiles:' as info;
SELECT 
  id,
  email,
  first_name,
  last_name,
  ministry_name,
  created_at
FROM verified_profiles
ORDER BY created_at DESC; 