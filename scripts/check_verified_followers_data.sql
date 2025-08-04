-- Check verified followers data to understand what's showing up
-- This will help us identify the source of the fake "Unknown User"

-- 1. Check what verified followers the current user has
-- Replace 'your-user-id' with your actual user ID
SELECT 'Verified followers for current user:' as info;
SELECT 
  uf.follower_id,
  uf.following_id,
  uf.created_at,
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
FROM user_follows uf
JOIN verified_profiles vp ON uf.follower_id = vp.id
-- WHERE uf.following_id = 'your-user-id'  -- Uncomment and replace with your user ID
ORDER BY uf.created_at DESC;

-- 2. Check all verified profiles to see if there are any with missing names
SELECT 'All verified profiles:' as info;
SELECT 
  id,
  email,
  first_name,
  last_name,
  ministry_name,
  created_at,
  CASE 
    WHEN first_name IS NULL AND last_name IS NULL THEN 'Unknown User'
    WHEN first_name IS NULL THEN CONCAT('', ' ', COALESCE(last_name, ''))
    WHEN last_name IS NULL THEN CONCAT(COALESCE(first_name, ''), ' ', '')
    ELSE CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))
  END as display_name
FROM verified_profiles
ORDER BY created_at DESC;

-- 3. Check if there are any test or fake profiles
SELECT 'Profiles that might be fake:' as info;
SELECT 
  id,
  email,
  first_name,
  last_name,
  ministry_name,
  created_at
FROM verified_profiles
WHERE 
  email LIKE '%test%' OR 
  email LIKE '%fake%' OR 
  email LIKE '%example%' OR
  first_name LIKE '%test%' OR
  last_name LIKE '%test%' OR
  first_name IS NULL OR
  last_name IS NULL
ORDER BY created_at DESC;

-- 4. Check the most recent profiles
SELECT 'Most recent verified profiles:' as info;
SELECT 
  id,
  email,
  first_name,
  last_name,
  ministry_name,
  created_at
FROM verified_profiles
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check if there are any follows at all
SELECT 'All follows in the system:' as info;
SELECT 
  follower_id,
  following_id,
  created_at
FROM user_follows
ORDER BY created_at DESC; 