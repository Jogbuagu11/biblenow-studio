-- Add sample followers data for testing
-- This script creates some sample follow relationships between users

-- First, let's check if we have any verified profiles to work with
SELECT id, email, first_name, last_name FROM verified_profiles LIMIT 5;

-- Add sample follow relationships
-- Note: Replace the UUIDs below with actual user IDs from your verified_profiles table

-- Example: User A follows User B
-- INSERT INTO user_follows (follower_id, following_id) 
-- VALUES 
--   ('user-a-uuid-here', 'user-b-uuid-here'),
--   ('user-b-uuid-here', 'user-c-uuid-here'),
--   ('user-c-uuid-here', 'user-a-uuid-here');

-- To get actual user IDs, run this query first:
-- SELECT id, email, first_name, last_name FROM verified_profiles;

-- Then replace the UUIDs in the INSERT statement above with the actual IDs

-- Example of how to add a follow relationship (uncomment and modify):
-- INSERT INTO user_follows (follower_id, following_id) 
-- SELECT 
--   (SELECT id FROM verified_profiles WHERE email = 'follower@example.com'),
--   (SELECT id FROM verified_profiles WHERE email = 'following@example.com')
-- WHERE NOT EXISTS (
--   SELECT 1 FROM user_follows 
--   WHERE follower_id = (SELECT id FROM verified_profiles WHERE email = 'follower@example.com')
--   AND following_id = (SELECT id FROM verified_profiles WHERE email = 'following@example.com')
-- ); 