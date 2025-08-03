-- Fix shekel_gifts foreign key constraints to work with both verified_profiles and profiles tables
-- The Flutter app created foreign keys pointing to 'users' table, but we need them to work with both tables

-- Drop existing foreign key constraints
ALTER TABLE public.shekel_gifts DROP CONSTRAINT IF EXISTS shekel_gifts_recipient_id_fkey;
ALTER TABLE public.shekel_gifts DROP CONSTRAINT IF EXISTS shekel_gifts_sender_id_fkey;

-- Create a function to validate that a user exists in either verified_profiles or profiles
CREATE OR REPLACE FUNCTION validate_user_exists_in_both_tables()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if sender_id exists in either table
  IF NOT EXISTS (
    SELECT 1 FROM verified_profiles WHERE id = NEW.sender_id
    UNION
    SELECT 1 FROM profiles WHERE id = NEW.sender_id
  ) THEN
    RAISE EXCEPTION 'Sender ID % does not exist in verified_profiles or profiles tables', NEW.sender_id;
  END IF;

  -- Check if recipient_id exists in either table
  IF NOT EXISTS (
    SELECT 1 FROM verified_profiles WHERE id = NEW.recipient_id
    UNION
    SELECT 1 FROM profiles WHERE id = NEW.recipient_id
  ) THEN
    RAISE EXCEPTION 'Recipient ID % does not exist in verified_profiles or profiles tables', NEW.recipient_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate user existence
DROP TRIGGER IF EXISTS validate_shekel_gifts_users ON shekel_gifts;
CREATE TRIGGER validate_shekel_gifts_users
  BEFORE INSERT OR UPDATE ON shekel_gifts
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_exists_in_both_tables();

-- Update RLS policies to work with both tables
DROP POLICY IF EXISTS "Users can view their own shekel gifts" ON shekel_gifts;
CREATE POLICY "Users can view their own shekel gifts" ON shekel_gifts
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

DROP POLICY IF EXISTS "Users can insert their own shekel gifts" ON shekel_gifts;
CREATE POLICY "Users can insert their own shekel gifts" ON shekel_gifts
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );

DROP POLICY IF EXISTS "Users can update their own shekel gifts" ON shekel_gifts;
CREATE POLICY "Users can update their own shekel gifts" ON shekel_gifts
  FOR UPDATE USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

DROP POLICY IF EXISTS "Users can delete their own shekel gifts" ON shekel_gifts;
CREATE POLICY "Users can delete their own shekel gifts" ON shekel_gifts
  FOR DELETE USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

-- Enable RLS on shekel_gifts if not already enabled
ALTER TABLE public.shekel_gifts ENABLE ROW LEVEL SECURITY; 