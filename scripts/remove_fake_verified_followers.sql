-- Remove fake verified followers with missing names
-- This script will clean up profiles that show as "Unknown User"

-- 1. First, let's see what fake data we have
SELECT 'Current fake verified followers:' as info;
SELECT 
  vp.id,
  vp.email,
  vp.first_name,
  vp.last_name,
  vp.ministry_name,
  CASE 
    WHEN vp.first_name IS NULL AND vp.last_name IS NULL THEN 'Unknown User'
    WHEN vp.first_name IS NULL THEN CONCAT('', ' ', COALESCE(vp.last_name, ''))
    WHEN vp.last_name IS NULL THEN CONCAT(COALESCE(vp.first_name, ''), ' ', '')
    ELSE CONCAT(COALESCE(vp.first_name, ''), ' ', COALESCE(vp.last_name, ''))
  END as display_name
FROM verified_profiles vp
WHERE vp.first_name IS NULL OR vp.last_name IS NULL;

-- 2. Check which of these fake profiles are actually following someone
SELECT 'Fake profiles that are following users:' as info;
SELECT 
  uf.follower_id,
  uf.following_id,
  uf.created_at,
  vp.email,
  vp.first_name,
  vp.last_name
FROM user_follows uf
JOIN verified_profiles vp ON uf.follower_id = vp.id
WHERE vp.first_name IS NULL OR vp.last_name IS NULL;

-- 3. Check which of these fake profiles are being followed
SELECT 'Fake profiles that are being followed:' as info;
SELECT 
  uf.follower_id,
  uf.following_id,
  uf.created_at,
  vp.email,
  vp.first_name,
  vp.last_name
FROM user_follows uf
JOIN verified_profiles vp ON uf.following_id = vp.id
WHERE vp.first_name IS NULL OR vp.last_name IS NULL;

-- 4. Remove fake follows where the follower has missing names
-- This will remove the "Unknown User" from your followers list
DELETE FROM user_follows 
WHERE follower_id IN (
  SELECT id FROM verified_profiles 
  WHERE first_name IS NULL OR last_name IS NULL
);

-- 5. Remove fake follows where the following user has missing names
-- This will remove follows to "Unknown User" profiles
DELETE FROM user_follows 
WHERE following_id IN (
  SELECT id FROM verified_profiles 
  WHERE first_name IS NULL OR last_name IS NULL
);

-- 6. Optionally, remove the fake verified profiles entirely
-- Uncomment the next line if you want to delete the fake profiles completely
-- DELETE FROM verified_profiles WHERE first_name IS NULL OR last_name IS NULL;

-- 7. Verify the cleanup worked
SELECT 'Verification - remaining follows:' as info;
SELECT COUNT(*) as total_follows FROM user_follows;

SELECT 'Verification - remaining verified profiles:' as info;
SELECT COUNT(*) as total_profiles FROM verified_profiles;

-- 8. Show remaining verified profiles to confirm they're real
SELECT 'Remaining verified profiles:' as info;
SELECT 
  id,
  email,
  first_name,
  last_name,
  ministry_name
FROM verified_profiles
ORDER BY created_at DESC; 