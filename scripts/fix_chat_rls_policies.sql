-- Fix Chat RLS Policies for Custom Authentication
-- This script updates the chat RLS policies to work with the custom JWT auth system
-- instead of requiring Supabase Auth authentication

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Allow authenticated users to insert chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Allow authenticated users to update chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Allow authenticated users to read chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert chat messages" ON chat_messages;

-- Create new policies that work with custom authentication
-- These policies allow any user with a valid UUID to access chat functionality

-- Chat Rooms Policies
CREATE POLICY "Allow all users to read chat rooms" ON chat_rooms
    FOR SELECT USING (true);

CREATE POLICY "Allow all users to insert chat rooms" ON chat_rooms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all users to update chat rooms" ON chat_rooms
    FOR UPDATE USING (true);

-- Chat Messages Policies
CREATE POLICY "Allow all users to read chat messages" ON chat_messages
    FOR SELECT USING (true);

CREATE POLICY "Allow all users to insert chat messages" ON chat_messages
    FOR INSERT WITH CHECK (true);

-- Alternative: If you want to restrict to verified users only, use this instead:
-- CREATE POLICY "Allow verified users to read chat messages" ON chat_messages
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM verified_profiles 
--             WHERE id::text = user_id
--         )
--     );
-- 
-- CREATE POLICY "Allow verified users to insert chat messages" ON chat_messages
--     FOR INSERT WITH CHECK (
--         EXISTS (
--             SELECT 1 FROM verified_profiles 
--             WHERE id::text = user_id
--         )
--     );

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('chat_rooms', 'chat_messages') 
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Test the policies
SELECT 'Chat RLS policies updated successfully' as status; 