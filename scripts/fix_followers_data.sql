-- Fix followers data issue
-- This script checks and potentially fixes the "Unknown User" issue

-- 1. First, let's see what we're working with
SELECT 'Current state check' as step;

-- Check user_follows data
SELECT 'user_follows data:' as info;
SELECT COUNT(*) as total_follows FROM user_follows;

-- Check verified_profiles data
SELECT 'verified_profiles data:' as info;
SELECT COUNT(*) as total_profiles FROM verified_profiles;

-- 2. Check for orphaned follows (follower_id not in verified_profiles)
SELECT 'Orphaned follows check:' as info;
SELECT 
  uf.follower_id,
  uf.following_id,
  uf.created_at,
  'Missing follower profile' as issue
FROM user_follows uf
LEFT JOIN verified_profiles vp ON uf.follower_id = vp.id
WHERE vp.id IS NULL;

-- 3. Check for orphaned following (following_id not in verified_profiles)
SELECT 'Orphaned following check:' as info;
SELECT 
  uf.follower_id,
  uf.following_id,
  uf.created_at,
  'Missing following profile' as issue
FROM user_follows uf
LEFT JOIN verified_profiles vp ON uf.following_id = vp.id
WHERE vp.id IS NULL;

-- 4. Check profiles with missing names
SELECT 'Profiles with missing names:' as info;
SELECT 
  id,
  email,
  first_name,
  last_name,
  CASE 
    WHEN first_name IS NULL AND last_name IS NULL THEN 'Both names missing'
    WHEN first_name IS NULL THEN 'First name missing'
    WHEN last_name IS NULL THEN 'Last name missing'
    ELSE 'Names present'
  END as name_status
FROM verified_profiles
WHERE first_name IS NULL OR last_name IS NULL;

-- 5. Test the exact query that the app uses
SELECT 'Testing app query logic:' as info;

-- Get a sample user to test with
WITH sample_user AS (
  SELECT id FROM verified_profiles LIMIT 1
)
SELECT 
  uf.follower_id,
  uf.following_id,
  uf.created_at,
  vp.first_name,
  vp.last_name,
  vp.email,
  vp.profile_photo_url,
  CASE 
    WHEN vp.first_name IS NULL AND vp.last_name IS NULL THEN 'Unknown User'
    ELSE COALESCE(vp.first_name, '') || ' ' || COALESCE(vp.last_name, '')
  END as display_name
FROM user_follows uf
LEFT JOIN verified_profiles vp ON uf.follower_id = vp.id
CROSS JOIN sample_user su
WHERE uf.following_id = su.id
ORDER BY uf.created_at DESC;

-- 6. If you want to fix missing names, uncomment and modify this section:
/*
-- Update profiles with missing names to have default values
UPDATE verified_profiles 
SET 
  first_name = COALESCE(first_name, 'User'),
  last_name = COALESCE(last_name, 'Unknown')
WHERE first_name IS NULL OR last_name IS NULL;
*/

-- 7. If you want to clean up orphaned follows, uncomment and modify this section:
/*
-- Delete orphaned follows (be careful with this!)
DELETE FROM user_follows 
WHERE follower_id NOT IN (SELECT id FROM verified_profiles)
   OR following_id NOT IN (SELECT id FROM verified_profiles);
*/ 