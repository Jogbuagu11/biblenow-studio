-- Setup Chat Authentication and Tables
-- This script creates the livestream chat tables with proper authentication

-- Enable RLS on all tables
ALTER TABLE IF EXISTS livestream_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_rooms ENABLE ROW LEVEL SECURITY;

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS livestream_chat CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;

-- Create chat_rooms table
CREATE TABLE chat_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Create livestream_chat table (messages)
CREATE TABLE livestream_chat (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    text TEXT NOT NULL,
    is_moderator BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_livestream_chat_room 
        FOREIGN KEY (room_id) 
        REFERENCES chat_rooms(room_id) 
        ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_livestream_chat_room_id ON livestream_chat(room_id);
CREATE INDEX IF NOT EXISTS idx_livestream_chat_created_at ON livestream_chat(created_at);
CREATE INDEX IF NOT EXISTS idx_livestream_chat_user_id ON livestream_chat(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_room_id ON chat_rooms(room_id);

-- Enable RLS
ALTER TABLE livestream_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read livestream chat" ON livestream_chat;
DROP POLICY IF EXISTS "Allow authenticated users to insert livestream chat" ON livestream_chat;
DROP POLICY IF EXISTS "Allow authenticated users to update livestream chat" ON livestream_chat;
DROP POLICY IF EXISTS "Allow authenticated users to read chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Allow authenticated users to insert chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Allow authenticated users to update chat rooms" ON chat_rooms;

-- Create RLS policies for livestream_chat
CREATE POLICY "Allow authenticated users to read livestream chat" ON livestream_chat
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert livestream chat" ON livestream_chat
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update livestream chat" ON livestream_chat
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create RLS policies for chat_rooms
CREATE POLICY "Allow authenticated users to read chat rooms" ON chat_rooms
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert chat rooms" ON chat_rooms
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update chat rooms" ON chat_rooms
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create function to automatically create chat room when first message is sent
CREATE OR REPLACE FUNCTION create_chat_room_if_not_exists()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert chat room if it doesn't exist
    INSERT INTO chat_rooms (room_id, name, is_active)
    VALUES (NEW.room_id, 'Livestream Chat', true)
    ON CONFLICT (room_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create chat room
DROP TRIGGER IF EXISTS trigger_create_chat_room ON livestream_chat;
CREATE TRIGGER trigger_create_chat_room
    BEFORE INSERT ON livestream_chat
    FOR EACH ROW
    EXECUTE FUNCTION create_chat_room_if_not_exists();

-- Create function to get recent messages for a room
CREATE OR REPLACE FUNCTION get_chat_messages(
    p_room_id TEXT,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    room_id TEXT,
    user_id TEXT,
    user_name TEXT,
    user_avatar TEXT,
    text TEXT,
    is_moderator BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lc.id,
        lc.room_id,
        lc.user_id,
        lc.user_name,
        lc.user_avatar,
        lc.text,
        lc.is_moderator,
        lc.created_at
    FROM livestream_chat lc
    WHERE lc.room_id = p_room_id
    ORDER BY lc.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON chat_rooms TO authenticated;
GRANT ALL ON livestream_chat TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_messages TO authenticated;
GRANT EXECUTE ON FUNCTION create_chat_room_if_not_exists TO authenticated;

-- Insert a test chat room
INSERT INTO chat_rooms (room_id, name, is_active) 
VALUES ('test-room', 'Test Chat Room', true)
ON CONFLICT (room_id) DO NOTHING;

-- Verify the setup
SELECT 
    'chat_rooms' as table_name,
    COUNT(*) as row_count 
FROM chat_rooms;

SELECT 
    'livestream_chat' as table_name,
    COUNT(*) as row_count 
FROM livestream_chat;

-- Show RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('chat_rooms', 'livestream_chat');

-- Show policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('chat_rooms', 'livestream_chat'); 