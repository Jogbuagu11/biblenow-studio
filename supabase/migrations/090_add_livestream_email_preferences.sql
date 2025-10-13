-- Add livestream notification email preferences to verified_profiles table
-- This allows users to control whether they receive email notifications when streamers they follow go live

-- First, check if email_preferences column exists and its current structure
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
    END IF;
END $$;

-- Update existing users to have default livestream notification preferences
UPDATE public.verified_profiles 
SET email_preferences = COALESCE(email_preferences, '{}'::jsonb) || '{"livestreamNotifications": true}'::jsonb
WHERE email_preferences IS NULL 
   OR NOT (email_preferences ? 'livestreamNotifications');

-- Create a function to update email preferences
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

-- Create a function to get email preferences
CREATE OR REPLACE FUNCTION get_email_preferences(user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    prefs JSONB;
BEGIN
    SELECT COALESCE(email_preferences, '{}'::jsonb)
    INTO prefs
    FROM public.verified_profiles
    WHERE id = user_id_param;
    
    RETURN prefs;
END;
$$;

-- Add RLS policy for email preferences
DROP POLICY IF EXISTS "Users can update their own email preferences" ON public.verified_profiles;

CREATE POLICY "Users can update their own email preferences" ON public.verified_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Create an index on email_preferences for better query performance
CREATE INDEX IF NOT EXISTS idx_verified_profiles_email_preferences 
ON public.verified_profiles USING GIN (email_preferences);

-- Add some sample email preference settings
COMMENT ON COLUMN public.verified_profiles.email_preferences IS 'JSON object containing user email notification preferences. Example: {"livestreamNotifications": true, "streamingLimitEmails": true}';
