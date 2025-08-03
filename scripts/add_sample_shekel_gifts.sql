-- Add sample shekel gifts data
-- This script adds some test data to the shekel_gifts table

-- First, let's get some user IDs from verified_profiles
DO $$
DECLARE
  user1_id uuid;
  user2_id uuid;
  user3_id uuid;
BEGIN
  -- Get the first few users from verified_profiles
  SELECT id INTO user1_id FROM verified_profiles LIMIT 1;
  
  -- Get a second user (if exists)
  SELECT id INTO user2_id FROM verified_profiles WHERE id != user1_id LIMIT 1;
  
  -- Get a third user (if exists)
  SELECT id INTO user3_id FROM verified_profiles WHERE id != user1_id AND id != user2_id LIMIT 1;
  
  -- If we don't have enough users, use the same user for testing
  IF user2_id IS NULL THEN
    user2_id := user1_id;
  END IF;
  
  IF user3_id IS NULL THEN
    user3_id := user1_id;
  END IF;

  -- Insert sample shekel gifts
  INSERT INTO shekel_gifts (
    sender_id,
    recipient_id,
    amount,
    message,
    is_anonymous,
    gift_type,
    context,
    context_id,
    status,
    tax_amount,
    total_amount,
    created_at
  ) VALUES 
  -- User 1 receives a tip from User 2
  (user2_id, user1_id, 50, 'Great stream!', false, 'tip', 'livestream', gen_random_uuid(), 'completed', 0, 50, NOW() - INTERVAL '2 hours'),
  
  -- User 1 sends a donation to User 3
  (user1_id, user3_id, 25, 'Supporting your ministry', false, 'donation', 'livestream', gen_random_uuid(), 'completed', 0, 25, NOW() - INTERVAL '1 day'),
  
  -- User 1 receives an anonymous gift
  (user2_id, user1_id, 100, null, true, 'gift', 'livestream', gen_random_uuid(), 'completed', 0, 100, NOW() - INTERVAL '3 days'),
  
  -- User 1 receives another tip
  (user3_id, user1_id, 75, 'Amazing content!', false, 'tip', 'livestream', gen_random_uuid(), 'completed', 0, 75, NOW() - INTERVAL '5 days'),
  
  -- User 1 sends a gift to User 2
  (user1_id, user2_id, 30, 'Keep up the good work!', false, 'gift', 'livestream', gen_random_uuid(), 'completed', 0, 30, NOW() - INTERVAL '1 week')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Added sample shekel gifts data';
END $$;

-- Show the sample data
SELECT 
  sg.id,
  sg.sender_id,
  sg.recipient_id,
  sg.amount,
  sg.message,
  sg.is_anonymous,
  sg.gift_type,
  sg.context,
  sg.status,
  sg.created_at,
  sender.email as sender_email,
  recipient.email as recipient_email
FROM shekel_gifts sg
LEFT JOIN verified_profiles sender ON sg.sender_id = sender.id
LEFT JOIN verified_profiles recipient ON sg.recipient_id = recipient.id
ORDER BY sg.created_at DESC; 