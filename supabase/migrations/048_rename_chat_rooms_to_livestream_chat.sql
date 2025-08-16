-- Rename chat_rooms table to livestream_chat
ALTER TABLE chat_rooms RENAME TO livestream_chat;

-- Update foreign key constraint in chat_messages table
ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS fk_chat_messages_room;

ALTER TABLE chat_messages 
ADD CONSTRAINT fk_chat_messages_room 
    FOREIGN KEY (room_id) 
    REFERENCES livestream_chat(room_id) 
    ON DELETE CASCADE;

-- Update indexes
DROP INDEX IF EXISTS idx_chat_rooms_room_id;
CREATE INDEX IF NOT EXISTS idx_livestream_chat_room_id ON livestream_chat(room_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to read chat rooms" ON livestream_chat;
DROP POLICY IF EXISTS "Allow authenticated users to insert chat rooms" ON livestream_chat;
DROP POLICY IF EXISTS "Allow authenticated users to update chat rooms" ON livestream_chat;

-- Create new RLS policies for livestream_chat
CREATE POLICY "Allow authenticated users to read livestream chat" ON livestream_chat
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert livestream chat" ON livestream_chat
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update livestream chat" ON livestream_chat
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Update the function that creates chat rooms
CREATE OR REPLACE FUNCTION create_chat_room_if_not_exists()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert chat room if it doesn't exist
    INSERT INTO livestream_chat (room_id, name, is_active)
    VALUES (NEW.room_id, 'Livestream Chat', true)
    ON CONFLICT (room_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update permissions
GRANT ALL ON livestream_chat TO authenticated; 