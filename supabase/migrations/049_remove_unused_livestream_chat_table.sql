-- Remove unused livestream_chat table and clean up dependencies

-- Drop the foreign key constraint from chat_messages
ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS fk_chat_messages_room;

-- Drop the unused livestream_chat table
DROP TABLE IF EXISTS livestream_chat CASCADE;

-- Drop the function that references the deleted table
DROP FUNCTION IF EXISTS create_chat_room_if_not_exists() CASCADE;

-- Drop the trigger that uses the deleted function
DROP TRIGGER IF EXISTS trigger_create_chat_room ON chat_messages;

-- Drop the index that was on the deleted table
DROP INDEX IF EXISTS idx_livestream_chat_room_id;

-- Verify chat_messages table still exists and has data
SELECT 
    'chat_messages' as table_name,
    COUNT(*) as row_count 
FROM chat_messages; 