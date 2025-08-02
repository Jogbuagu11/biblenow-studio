-- Fix orphaned follows issue
-- The problem: follower_id values in user_follows don't exist in verified_profiles

-- 1. First, let's see the orphaned follows
SELECT 'Orphaned follows found:' as info;
SELECT 
  uf.follower_id,
  uf.following_id,
  uf.created_at,
  'Missing follower profile' as issue
FROM user_follows uf
LEFT JOIN verified_profiles vp ON uf.follower_id = vp.id
WHERE vp.id IS NULL;

-- 2. Check if the following_id users exist
SELECT 'Following users check:' as info;
SELECT 
  uf.follower_id,
  uf.following_id,
  uf.created_at,
  CASE 
    WHEN vp.id IS NOT NULL THEN 'Following user exists'
    ELSE 'Following user also missing'
  END as following_status
FROM user_follows uf
LEFT JOIN verified_profiles vp ON uf.following_id = vp.id
WHERE uf.follower_id NOT IN (SELECT id FROM verified_profiles);

-- 3. Show current verified_profiles
SELECT 'Current verified_profiles:' as info;
SELECT id, email, first_name, last_name FROM verified_profiles;

-- 4. OPTION 1: Create placeholder profiles for missing followers
-- Uncomment this section if you want to create placeholder profiles
/*
INSERT INTO verified_profiles (id, email, first_name, last_name, role, status)
SELECT 
  uf.follower_id,
  'unknown-' || uf.follower_id || '@placeholder.com',
  'Unknown',
  'User',
  'user',
  'active'
FROM user_follows uf
LEFT JOIN verified_profiles vp ON uf.follower_id = vp.id
WHERE vp.id IS NULL
ON CONFLICT (id) DO NOTHING;
*/

-- 5. OPTION 2: Clean up orphaned follows (RECOMMENDED)
-- This removes follows where the follower doesn't exist in verified_profiles
-- Uncomment this section if you want to clean up orphaned follows
/*
DELETE FROM user_follows 
WHERE follower_id NOT IN (SELECT id FROM verified_profiles);
*/

-- 6. OPTION 3: Clean up follows where both users are missing
-- This removes follows where neither the follower nor following user exists
-- Uncomment this section if you want to clean up completely orphaned follows
/*
DELETE FROM user_follows 
WHERE follower_id NOT IN (SELECT id FROM verified_profiles)
   OR following_id NOT IN (SELECT id FROM verified_profiles);
*/

-- 7. After fixing, verify the data
SELECT 'Verification after fix:' as info;
SELECT 
  uf.follower_id,
  uf.following_id,
  uf.created_at,
  vp.first_name,
  vp.last_name,
  vp.email
FROM user_follows uf
LEFT JOIN verified_profiles vp ON uf.follower_id = vp.id
ORDER BY uf.created_at DESC; 