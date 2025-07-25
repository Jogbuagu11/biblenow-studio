-- Fix verified_profiles table ID format to ensure proper UUIDs
-- This migration will update any non-UUID IDs to proper UUID format

-- First, let's check if there are any non-UUID IDs in the verified_profiles table
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    -- Count records with non-UUID IDs (cast to text first)
    SELECT COUNT(*) INTO record_count
    FROM public.verified_profiles
    WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    RAISE NOTICE 'Found % records with non-UUID IDs', record_count;
    
    -- Update any non-UUID IDs to proper UUIDs
    IF record_count > 0 THEN
        UPDATE public.verified_profiles
        SET id = gen_random_uuid()
        WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        RAISE NOTICE 'Updated % records to use proper UUIDs', record_count;
    END IF;
END $$;

-- Ensure the id column is properly typed as UUID
ALTER TABLE public.verified_profiles 
ALTER COLUMN id TYPE UUID USING id::UUID;

-- Add a constraint to ensure future IDs are UUIDs
ALTER TABLE public.verified_profiles 
ADD CONSTRAINT verified_profiles_id_uuid_check 
CHECK (id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Update the default value to use gen_random_uuid()
ALTER TABLE public.verified_profiles 
ALTER COLUMN id SET DEFAULT gen_random_uuid(); 