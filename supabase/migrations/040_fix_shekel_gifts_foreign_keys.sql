-- Fix foreign key relationships in shekel_gifts table
-- Update to point to the correct tables (profiles and verified_profiles)

-- First, drop existing foreign key constraints
ALTER TABLE public.shekel_gifts 
DROP CONSTRAINT IF EXISTS shekel_gifts_recipient_id_fkey;

ALTER TABLE public.shekel_gifts 
DROP CONSTRAINT IF EXISTS shekel_gifts_sender_id_fkey;

-- Add new foreign key constraints that reference both tables
-- Note: We'll use a more flexible approach since users can exist in either table

-- For now, let's create a function to handle the foreign key validation
CREATE OR REPLACE FUNCTION validate_user_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user exists in either profiles or verified_profiles
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.sender_id
    UNION
    SELECT 1 FROM verified_profiles WHERE id = NEW.sender_id
  ) THEN
    RAISE EXCEPTION 'Sender user does not exist in profiles or verified_profiles';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.recipient_id
    UNION
    SELECT 1 FROM verified_profiles WHERE id = NEW.recipient_id
  ) THEN
    RAISE EXCEPTION 'Recipient user does not exist in profiles or verified_profiles';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate user existence
DROP TRIGGER IF EXISTS validate_shekel_gifts_users ON shekel_gifts;
CREATE TRIGGER validate_shekel_gifts_users
  BEFORE INSERT OR UPDATE ON shekel_gifts
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_exists();

-- Update RLS policies to work with both tables
DROP POLICY IF EXISTS "Users can view their own gifts" ON public.shekel_gifts;
CREATE POLICY "Users can view their own gifts" ON public.shekel_gifts
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

DROP POLICY IF EXISTS "Users can insert gifts" ON public.shekel_gifts;
CREATE POLICY "Users can insert gifts" ON public.shekel_gifts
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update their own gifts" ON public.shekel_gifts;
CREATE POLICY "Users can update their own gifts" ON public.shekel_gifts
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = recipient_id); 