-- Fix Chat RLS Policies for Custom Authentication
-- This script updates the RLS policies to work with custom authentication

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read livestream chat" ON livestream_chat;
DROP POLICY IF EXISTS "Allow authenticated users to insert livestream chat" ON livestream_chat;
DROP POLICY IF EXISTS "Allow authenticated users to update livestream chat" ON livestream_chat;
DROP POLICY IF EXISTS "Allow authenticated users to read chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Allow authenticated users to insert chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Allow authenticated users to update chat rooms" ON chat_rooms;

-- Create new RLS policies that allow all authenticated users (including custom auth)
CREATE POLICY "Allow all users to read livestream chat" ON livestream_chat
    FOR SELECT USING (true);

CREATE POLICY "Allow all users to insert livestream chat" ON livestream_chat
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all users to update livestream chat" ON livestream_chat
    FOR UPDATE USING (true);

-- Create RLS policies for chat_rooms
CREATE POLICY "Allow all users to read chat rooms" ON chat_rooms
    FOR SELECT USING (true);

CREATE POLICY "Allow all users to insert chat rooms" ON chat_rooms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all users to update chat rooms" ON chat_rooms
    FOR UPDATE USING (true);

-- Verify the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('chat_rooms', 'livestream_chat')
ORDER BY tablename, policyname; 