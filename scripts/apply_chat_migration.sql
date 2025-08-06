-- Apply chat tables migration
-- This script creates the necessary tables for Supabase chat functionality

-- Create chat rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    text TEXT NOT NULL,
    is_moderator BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add foreign key constraint to chat_rooms
    CONSTRAINT fk_chat_messages_room 
        FOREIGN KEY (room_id) 
        REFERENCES chat_rooms(room_id) 
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_room_id ON chat_rooms(room_id);

-- Enable Row Level Security
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chat_rooms
CREATE POLICY "Allow authenticated users to read chat rooms" ON chat_rooms
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert chat rooms" ON chat_rooms
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update chat rooms" ON chat_rooms
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create RLS policies for chat_messages
CREATE POLICY "Allow authenticated users to read chat messages" ON chat_messages
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert chat messages" ON chat_messages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create chat room
CREATE TRIGGER trigger_create_chat_room
    BEFORE INSERT ON chat_messages
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
        cm.id,
        cm.room_id,
        cm.user_id,
        cm.user_name,
        cm.user_avatar,
        cm.text,
        cm.is_moderator,
        cm.created_at
    FROM chat_messages cm
    WHERE cm.room_id = p_room_id
    ORDER BY cm.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON chat_rooms TO authenticated;
GRANT ALL ON chat_messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_messages TO authenticated;

-- Verify the migration
SELECT 'Chat tables created successfully' as status;
SELECT COUNT(*) as chat_rooms_count FROM chat_rooms;
SELECT COUNT(*) as chat_messages_count FROM chat_messages; 