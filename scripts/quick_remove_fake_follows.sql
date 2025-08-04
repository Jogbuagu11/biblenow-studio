-- Quick script to remove fake follows (Unknown User)
-- This will remove the fake follower from your verified followers list

-- Remove follows where the follower has missing names (Unknown User)
DELETE FROM user_follows 
WHERE follower_id IN (
  SELECT id FROM verified_profiles 
  WHERE first_name IS NULL OR last_name IS NULL
);

-- Verify the cleanup
SELECT 'Remaining follows:' as info;
SELECT COUNT(*) as total_follows FROM user_follows;

SELECT 'Remaining verified profiles:' as info;
SELECT COUNT(*) as total_profiles FROM verified_profiles; 