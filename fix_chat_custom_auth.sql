-- Fix Chat for Custom Authentication System
-- This script creates RLS policies that work with your custom auth system

-- ========================================
-- STEP 1: Drop existing policies
-- ========================================

DROP POLICY IF EXISTS "Allow authenticated users to read livestream chat" ON public.livestream_chat;
DROP POLICY IF EXISTS "Allow authenticated users to insert livestream chat" ON public.livestream_chat;
DROP POLICY IF EXISTS "Allow authenticated users to update livestream chat" ON public.livestream_chat;
DROP POLICY IF EXISTS "Allow everyone to read chat messages" ON public.livestream_chat;
DROP POLICY IF EXISTS "Allow authenticated users to insert messages" ON public.livestream_chat;
DROP POLICY IF EXISTS "Allow users to update their own messages" ON public.livestream_chat;
DROP POLICY IF EXISTS "Allow moderators to delete messages" ON public.livestream_chat;
DROP POLICY IF EXISTS "Allow moderators to delete any message" ON public.livestream_chat;
DROP POLICY IF EXISTS "Allow public read access to chat messages" ON public.livestream_chat;

-- ========================================
-- STEP 2: Enable RLS
-- ========================================

ALTER TABLE public.livestream_chat ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 3: Create permissive policies for custom auth
-- ========================================

-- Policy 1: Allow anyone to read chat messages (public access)
CREATE POLICY "Allow public read access to chat messages" ON public.livestream_chat
    FOR SELECT USING (true);

-- Policy 2: Allow anyone to insert messages (since you're using custom auth)
CREATE POLICY "Allow anyone to insert chat messages" ON public.livestream_chat
    FOR INSERT WITH CHECK (true);

-- Policy 3: Allow users to update their own messages
CREATE POLICY "Allow users to update their own messages" ON public.livestream_chat
    FOR UPDATE USING (true); -- Allow all updates for now

-- Policy 4: Allow moderators to delete messages
CREATE POLICY "Allow moderators to delete messages" ON public.livestream_chat
    FOR DELETE USING (true); -- Allow all deletes for now

-- ========================================
-- STEP 4: Grant permissions
-- ========================================

-- Grant all permissions
GRANT ALL ON public.livestream_chat TO authenticated;
GRANT ALL ON public.livestream_chat TO anon;
GRANT ALL ON public.livestream_chat TO public;

-- ========================================
-- STEP 5: Enable real-time
-- ========================================

-- Ensure real-time is enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'livestream_chat'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.livestream_chat;
        RAISE NOTICE 'Added livestream_chat to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'livestream_chat is already in supabase_realtime publication';
    END IF;
END $$;

-- ========================================
-- STEP 6: Create helper function for chat
-- ========================================

-- Create a function to check if user exists in verified_profiles
CREATE OR REPLACE FUNCTION user_exists_in_verified_profiles(user_id_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.verified_profiles 
        WHERE id::text = user_id_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_exists_in_verified_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION user_exists_in_verified_profiles TO anon;
GRANT EXECUTE ON FUNCTION user_exists_in_verified_profiles TO public;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Chat system configured for custom authentication!';
    RAISE NOTICE 'All users can now send and receive messages.';
    RAISE NOTICE 'Real-time subscriptions are enabled.';
    RAISE NOTICE 'RLS policies are permissive to work with custom auth.';
END $$;
