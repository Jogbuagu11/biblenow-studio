-- Apply user_follows table migration
-- This script creates the user_follows table and sets up the necessary indexes and policies

-- Create the user_follows table
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.verified_profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.verified_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON public.user_follows(created_at);

-- Create unique constraint to prevent duplicate follows
-- A user can only follow another user once
ALTER TABLE public.user_follows 
ADD CONSTRAINT IF NOT EXISTS unique_user_follow 
UNIQUE (follower_id, following_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_user_follows_updated_at
  BEFORE UPDATE ON public.user_follows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.user_follows IS 'Tracks follower relationships between users';
COMMENT ON COLUMN public.user_follows.follower_id IS 'The user who is following (follower)';
COMMENT ON COLUMN public.user_follows.following_id IS 'The user being followed (following)';
COMMENT ON COLUMN public.user_follows.created_at IS 'When the follow relationship was created';

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_follows table

-- Policy: Users can view their own follows and followers
CREATE POLICY "Users can view their own follows and followers" ON public.user_follows
  FOR SELECT USING (
    auth.uid()::text = follower_id::text OR 
    auth.uid()::text = following_id::text
  );

-- Policy: Users can create follows (follow other users)
CREATE POLICY "Users can create follows" ON public.user_follows
  FOR INSERT WITH CHECK (
    auth.uid()::text = follower_id::text
  );

-- Policy: Users can delete their own follows (unfollow)
CREATE POLICY "Users can delete their own follows" ON public.user_follows
  FOR DELETE USING (
    auth.uid()::text = follower_id::text
  );

-- Policy: Users can update their own follows (for future features)
CREATE POLICY "Users can update their own follows" ON public.user_follows
  FOR UPDATE USING (
    auth.uid()::text = follower_id::text
  );

-- Verify the table was created successfully
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_follows' 
ORDER BY ordinal_position;

-- Show the created indexes
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'user_follows'; 