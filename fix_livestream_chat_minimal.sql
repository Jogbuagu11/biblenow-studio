-- Minimal Fix for Livestream Chat System
-- This script only fixes the RLS policies with proper type casting

-- ========================================
-- STEP 1: Clean up existing policies
-- ========================================

-- Drop all existing policies to start fresh
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
-- STEP 2: Enable Row Level Security
-- ========================================

-- Enable RLS
ALTER TABLE public.livestream_chat ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 3: Create simple, working policies
-- ========================================

-- Policy 1: Allow anyone to read chat messages (for public livestreams)
CREATE POLICY "Allow public read access to chat messages" ON public.livestream_chat
    FOR SELECT USING (true);

-- Policy 2: Allow authenticated users to insert messages
CREATE POLICY "Allow authenticated users to insert messages" ON public.livestream_chat
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy 3: Allow users to update their own messages (with proper type casting)
CREATE POLICY "Allow users to update their own messages" ON public.livestream_chat
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy 4: Allow moderators to delete messages (with proper type casting)
CREATE POLICY "Allow moderators to delete messages" ON public.livestream_chat
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.verified_profiles 
            WHERE id::text = auth.uid()::text 
            AND is_moderator = true
        )
    );

-- ========================================
-- STEP 4: Grant necessary permissions
-- ========================================

-- Grant permissions to authenticated users
GRANT ALL ON public.livestream_chat TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions to anon users for reading
GRANT SELECT ON public.livestream_chat TO anon;

-- ========================================
-- STEP 5: Enable real-time functionality
-- ========================================

-- Add table to realtime publication if not already added
DO $$
BEGIN
    -- Check if the table is already in the publication
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
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Livestream chat system has been fixed!';
    RAISE NOTICE 'Streamers and viewers can now send and receive messages.';
    RAISE NOTICE 'Real-time subscriptions are enabled.';
END $$;
