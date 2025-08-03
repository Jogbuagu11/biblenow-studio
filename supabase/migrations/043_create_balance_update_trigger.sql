-- Create trigger to automatically update user balance when shekel gifts are received
-- This will ensure the balance field stays in sync with actual gift transactions

-- Create function to handle balance updates
CREATE OR REPLACE FUNCTION update_user_balance_on_gift()
RETURNS TRIGGER AS $$
BEGIN
  -- When a gift is inserted or updated
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update recipient's balance (add the gift amount)
    IF NEW.status = 'completed' THEN
      -- Try to update verified_profiles first
      UPDATE verified_profiles 
      SET shekel_balance = COALESCE(shekel_balance, 0) + NEW.amount
      WHERE id = NEW.recipient_id;
      
      -- If no rows were updated in verified_profiles, try profiles table
      IF NOT FOUND THEN
        UPDATE profiles 
        SET shekel_balance = COALESCE(shekel_balance, 0) + NEW.amount
        WHERE id = NEW.recipient_id;
      END IF;
      
      -- Update sender's balance (subtract the gift amount)
      -- Try to update verified_profiles first
      UPDATE verified_profiles 
      SET shekel_balance = COALESCE(shekel_balance, 0) - NEW.amount
      WHERE id = NEW.sender_id;
      
      -- If no rows were updated in verified_profiles, try profiles table
      IF NOT FOUND THEN
        UPDATE profiles 
        SET shekel_balance = COALESCE(shekel_balance, 0) - NEW.amount
        WHERE id = NEW.sender_id;
      END IF;
    END IF;
  END IF;
  
  -- When a gift is deleted
  IF TG_OP = 'DELETE' THEN
    -- Reverse the balance changes
    IF OLD.status = 'completed' THEN
      -- Update recipient's balance (subtract the gift amount)
      UPDATE verified_profiles 
      SET shekel_balance = COALESCE(shekel_balance, 0) - OLD.amount
      WHERE id = OLD.recipient_id;
      
      IF NOT FOUND THEN
        UPDATE profiles 
        SET shekel_balance = COALESCE(shekel_balance, 0) - OLD.amount
        WHERE id = OLD.recipient_id;
      END IF;
      
      -- Update sender's balance (add back the gift amount)
      UPDATE verified_profiles 
      SET shekel_balance = COALESCE(shekel_balance, 0) + OLD.amount
      WHERE id = OLD.sender_id;
      
      IF NOT FOUND THEN
        UPDATE profiles 
        SET shekel_balance = COALESCE(shekel_balance, 0) + OLD.amount
        WHERE id = OLD.sender_id;
      END IF;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on shekel_gifts table
DROP TRIGGER IF EXISTS update_balance_on_gift ON shekel_gifts;
CREATE TRIGGER update_balance_on_gift
  AFTER INSERT OR UPDATE OR DELETE ON shekel_gifts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_balance_on_gift();

-- Also create a function to recalculate all balances from existing gifts
CREATE OR REPLACE FUNCTION recalculate_all_balances()
RETURNS void AS $$
BEGIN
  -- Reset all balances to 0 first
  UPDATE verified_profiles SET shekel_balance = 0;
  UPDATE profiles SET shekel_balance = 0;
  
  -- Recalculate based on completed gifts
  -- Add received gifts
  UPDATE verified_profiles 
  SET shekel_balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM shekel_gifts 
    WHERE recipient_id = verified_profiles.id AND status = 'completed'
  );
  
  UPDATE profiles 
  SET shekel_balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM shekel_gifts 
    WHERE recipient_id = profiles.id AND status = 'completed'
  );
  
  -- Subtract sent gifts
  UPDATE verified_profiles 
  SET shekel_balance = shekel_balance - (
    SELECT COALESCE(SUM(amount), 0)
    FROM shekel_gifts 
    WHERE sender_id = verified_profiles.id AND status = 'completed'
  );
  
  UPDATE profiles 
  SET shekel_balance = shekel_balance - (
    SELECT COALESCE(SUM(amount), 0)
    FROM shekel_gifts 
    WHERE sender_id = profiles.id AND status = 'completed'
  );
END;
$$ LANGUAGE plpgsql; 