-- Fix the shield_user_transaction function to resolve ambiguous column references

CREATE OR REPLACE FUNCTION shield_user_transaction(
  user_id UUID,
  shielded_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Start transaction
  BEGIN
    -- 1. Remove follow relationship (if it exists)
    DELETE FROM user_follows 
    WHERE (follower_id = user_id AND following_id = shielded_user_id)
       OR (follower_id = shielded_user_id AND following_id = user_id);
    
    -- 2. Add to shielded users (if not already shielded)
    INSERT INTO user_shields (user_id, shielded_user_id)
    VALUES (user_id, shielded_user_id)
    ON CONFLICT DO NOTHING;
    
    -- 3. Return success result
    result := json_build_object(
      'success', true,
      'message', 'User shielded successfully',
      'user_id', user_id,
      'shielded_user_id', shielded_user_id
    );
    
    RETURN result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback transaction on error
      RAISE EXCEPTION 'Error in shield_user_transaction: %', SQLERRM;
  END;
END;
$$; 