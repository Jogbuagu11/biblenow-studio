-- Debug script to find the fake verified follower
-- This will help us identify where the "Unknown User" is coming from

-- 1. Check all verified profiles for missing names
SELECT 'All verified profiles with missing names:' as info;
SELECT 
  id,
  email,
  first_name,
  last_name,
  ministry_name,
  created_at
FROM verified_profiles 
WHERE first_name IS NULL OR last_name IS NULL
ORDER BY created_at DESC;

-- 2. Check user_follows table for any follows
SELECT 'All user_follows entries:' as info;
SELECT 
  follower_id,
  following_id,
  created_at
FROM user_follows
ORDER BY created_at DESC;

-- 3. Check if there are any follows to profiles with missing names
SELECT 'Follows to profiles with missing names:' as info;
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

-- 4. Check if there are any follows FROM profiles with missing names
SELECT 'Follows FROM profiles with missing names:' as info;
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

-- 5. Check total counts
SELECT 'Counts:' as info;
SELECT 
  (SELECT COUNT(*) FROM verified_profiles) as total_verified_profiles,
  (SELECT COUNT(*) FROM user_follows) as total_follows,
  (SELECT COUNT(*) FROM verified_profiles WHERE first_name IS NULL OR last_name IS NULL) as profiles_with_missing_names;

-- 6. Check if there are any orphaned follows (follower_id not in verified_profiles)
SELECT 'Orphaned follows (follower_id not in verified_profiles):' as info;
SELECT 
  uf.follower_id,
  uf.following_id,
  uf.created_at
FROM user_follows uf
LEFT JOIN verified_profiles vp ON uf.follower_id = vp.id
WHERE vp.id IS NULL;

-- 7. Check if there are any orphaned follows (following_id not in verified_profiles)
SELECT 'Orphaned follows (following_id not in verified_profiles):' as info;
SELECT 
  uf.follower_id,
  uf.following_id,
  uf.created_at
FROM user_follows uf
LEFT JOIN verified_profiles vp ON uf.following_id = vp.id
WHERE vp.id IS NULL; 