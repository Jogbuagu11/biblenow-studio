-- Remove fake/test follows from user_follows table
-- This script will help clean up any test data

-- First, let's see what follows exist
SELECT 'Current follows:' as info;
SELECT 
  uf.id,
  uf.follower_id,
  uf.following_id,
  uf.created_at,
  follower.email as follower_email,
  following.email as following_email
FROM user_follows uf
LEFT JOIN verified_profiles follower ON uf.follower_id = follower.id
LEFT JOIN verified_profiles following ON uf.following_id = following.id
ORDER BY uf.created_at DESC;

-- Remove follows where either follower or following doesn't exist in verified_profiles
DELETE FROM user_follows 
WHERE follower_id NOT IN (SELECT id FROM verified_profiles)
   OR following_id NOT IN (SELECT id FROM verified_profiles);

-- Remove follows with test/fake email patterns
DELETE FROM user_follows 
WHERE follower_id IN (
  SELECT id FROM verified_profiles 
  WHERE email LIKE '%test%' 
     OR email LIKE '%fake%' 
     OR email LIKE '%example%'
     OR email LIKE '%@test.com'
     OR email LIKE '%@example.com'
)
   OR following_id IN (
  SELECT id FROM verified_profiles 
  WHERE email LIKE '%test%' 
     OR email LIKE '%fake%' 
     OR email LIKE '%example%'
     OR email LIKE '%@test.com'
     OR email LIKE '%@example.com'
);

-- Remove follows created in the last 24 hours (likely test data)
DELETE FROM user_follows 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Show remaining follows
SELECT 'Remaining follows:' as info;
SELECT 
  uf.id,
  uf.follower_id,
  uf.following_id,
  uf.created_at,
  follower.email as follower_email,
  following.email as following_email
FROM user_follows uf
LEFT JOIN verified_profiles follower ON uf.follower_id = follower.id
LEFT JOIN verified_profiles following ON uf.following_id = following.id
ORDER BY uf.created_at DESC; 