-- Script to rename chat_messages table to livestream_chat
-- Run this script in your Supabase SQL editor

-- Rename chat_messages table to livestream_chat
ALTER TABLE chat_messages RENAME TO livestream_chat;

-- Update indexes
DROP INDEX IF EXISTS idx_chat_messages_room_id;
CREATE INDEX IF NOT EXISTS idx_livestream_chat_room_id ON livestream_chat(room_id);

DROP INDEX IF EXISTS idx_chat_messages_created_at;
CREATE INDEX IF NOT EXISTS idx_livestream_chat_created_at ON livestream_chat(created_at);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to read chat messages" ON livestream_chat;
DROP POLICY IF EXISTS "Allow authenticated users to insert chat messages" ON livestream_chat;

-- Create new RLS policies for livestream_chat
CREATE POLICY "Allow authenticated users to read livestream chat" ON livestream_chat
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert livestream chat" ON livestream_chat
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Update permissions
GRANT ALL ON livestream_chat TO authenticated;

-- Verify the changes
SELECT 
    'livestream_chat' as table_name,
    COUNT(*) as row_count 
FROM livestream_chat;

-- Show the table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'livestream_chat'
ORDER BY ordinal_position; 