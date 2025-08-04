-- Debug script to check shielded users data
-- This will help us understand why shielded users aren't appearing in the list

-- 1. Check what's in the user_shields table
SELECT 'All user_shields entries:' as info;
SELECT 
  id,
  user_id,
  shielded_user_id,
  created_at
FROM user_shields
ORDER BY created_at DESC;

-- 2. Check if there are any shielded users for a specific user
-- Replace 'your-user-id' with your actual user ID
SELECT 'Shielded users for current user:' as info;
SELECT 
  us.id,
  us.user_id,
  us.shielded_user_id,
  us.created_at
FROM user_shields us
-- WHERE us.user_id = 'your-user-id'  -- Uncomment and replace with your user ID
ORDER BY us.created_at DESC;

-- 3. Check if the shielded user profiles exist
SELECT 'Shielded user profiles:' as info;
SELECT 
  us.shielded_user_id,
  us.created_at,
  vp.first_name,
  vp.last_name,
  vp.email,
  vp.ministry_name
FROM user_shields us
LEFT JOIN verified_profiles vp ON us.shielded_user_id = vp.id
-- WHERE us.user_id = 'your-user-id'  -- Uncomment and replace with your user ID
ORDER BY us.created_at DESC;

-- 4. Check if there are any orphaned shields (shielded_user_id not in verified_profiles)
SELECT 'Orphaned shields (shielded_user_id not in verified_profiles):' as info;
SELECT 
  us.id,
  us.user_id,
  us.shielded_user_id,
  us.created_at
FROM user_shields us
LEFT JOIN verified_profiles vp ON us.shielded_user_id = vp.id
WHERE vp.id IS NULL;

-- 5. Check total counts
SELECT 'Counts:' as info;
SELECT 
  (SELECT COUNT(*) FROM user_shields) as total_shields,
  (SELECT COUNT(*) FROM verified_profiles) as total_verified_profiles,
  (SELECT COUNT(*) FROM user_shields WHERE user_id = 'your-user-id') as user_shields_count;  -- Replace with your user ID

-- 6. Test the exact query that getShieldedUsers uses
SELECT 'Testing getShieldedUsers query:' as info;
SELECT 
  us.shielded_user_id,
  us.created_at,
  vp.first_name,
  vp.last_name,
  vp.email,
  vp.profile_photo_url,
  vp.ministry_name
FROM user_shields us
LEFT JOIN verified_profiles vp ON us.shielded_user_id = vp.id
-- WHERE us.user_id = 'your-user-id'  -- Uncomment and replace with your user ID
ORDER BY us.created_at DESC; 