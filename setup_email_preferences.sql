-- Setup script for email preferences
-- Run this in your Supabase SQL editor to add email preferences support

-- 1. Add email_preferences column to verified_profiles table
DO $$
BEGIN
    -- Check if email_preferences column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'verified_profiles' 
        AND column_name = 'email_preferences'
    ) THEN
        -- Add email_preferences column if it doesn't exist
        ALTER TABLE public.verified_profiles 
        ADD COLUMN email_preferences JSONB DEFAULT '{}';
        
        -- Add comment
        COMMENT ON COLUMN public.verified_profiles.email_preferences IS 'User email notification preferences';
        
        RAISE NOTICE 'Added email_preferences column to verified_profiles table';
    ELSE
        RAISE NOTICE 'email_preferences column already exists';
    END IF;
END $$;

-- 2. Update existing users to have default email preferences
UPDATE public.verified_profiles 
SET email_preferences = COALESCE(email_preferences, '{}'::jsonb) || '{"livestreamNotifications": true, "streamingLimitEmails": true}'::jsonb
WHERE email_preferences IS NULL 
   OR email_preferences = '{}'::jsonb;

-- 3. Create helper functions for email preferences
CREATE OR REPLACE FUNCTION update_email_preferences(
    user_id_param UUID,
    preferences JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.verified_profiles
    SET email_preferences = COALESCE(email_preferences, '{}'::jsonb) || preferences
    WHERE id = user_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION get_email_preferences(user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    prefs JSONB;
BEGIN
    SELECT COALESCE(email_preferences, '{"livestreamNotifications": true, "streamingLimitEmails": true}'::jsonb)
    INTO prefs
    FROM public.verified_profiles
    WHERE id = user_id_param;
    
    RETURN prefs;
END;
$$;

-- 4. Add RLS policy for email preferences
DROP POLICY IF EXISTS "Users can update their own email preferences" ON public.verified_profiles;

CREATE POLICY "Users can update their own email preferences" ON public.verified_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 5. Create an index on email_preferences for better query performance
CREATE INDEX IF NOT EXISTS idx_verified_profiles_email_preferences 
ON public.verified_profiles USING GIN (email_preferences);

-- 6. Add some sample email preference settings
COMMENT ON COLUMN public.verified_profiles.email_preferences IS 'JSON object containing user email notification preferences. Example: {"livestreamNotifications": true, "streamingLimitEmails": true}';

-- 7. Verify the setup
SELECT 'Setup completed successfully!' as status;
SELECT 'email_preferences column added to verified_profiles table' as message;

-- 8. Show current email preferences
SELECT 
    id,
    first_name,
    last_name,
    email,
    email_preferences
FROM verified_profiles 
WHERE email_preferences IS NOT NULL
LIMIT 5;
