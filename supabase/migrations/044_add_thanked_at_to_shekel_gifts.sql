-- Add thanked_at column to shekel_gifts table
ALTER TABLE shekel_gifts 
ADD COLUMN thanked_at TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance
CREATE INDEX idx_shekel_gifts_thanked_at ON shekel_gifts(thanked_at); 