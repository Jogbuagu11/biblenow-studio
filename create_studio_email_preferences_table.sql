-- Create dedicated studio_email_preferences table
-- This provides a separate table for email preferences instead of using JSONB in verified_profiles

-- 1. Create the studio_email_preferences table
CREATE TABLE IF NOT EXISTS public.studio_email_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.verified_profiles(id) ON DELETE CASCADE,
    livestream_notifications BOOLEAN DEFAULT true,
    streaming_limit_emails BOOLEAN DEFAULT true,
    weekly_digest BOOLEAN DEFAULT false,
    marketing_emails BOOLEAN DEFAULT false,
    system_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user
    UNIQUE(user_id)
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_studio_email_preferences_user_id ON public.studio_email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_email_preferences_livestream ON public.studio_email_preferences(livestream_notifications);
CREATE INDEX IF NOT EXISTS idx_studio_email_preferences_streaming_limit ON public.studio_email_preferences(streaming_limit_emails);

-- 3. Enable RLS
ALTER TABLE public.studio_email_preferences ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
DROP POLICY IF EXISTS "Users can view their own email preferences" ON public.studio_email_preferences;
DROP POLICY IF EXISTS "Users can update their own email preferences" ON public.studio_email_preferences;
DROP POLICY IF EXISTS "Users can insert their own email preferences" ON public.studio_email_preferences;
DROP POLICY IF EXISTS "Service role can manage all email preferences" ON public.studio_email_preferences;

CREATE POLICY "Users can view their own email preferences" ON public.studio_email_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own email preferences" ON public.studio_email_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email preferences" ON public.studio_email_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all email preferences" ON public.studio_email_preferences
    FOR ALL USING (auth.role() = 'service_role');

-- 5. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_studio_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_studio_email_preferences_updated_at
    BEFORE UPDATE ON public.studio_email_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_studio_email_preferences_updated_at();

-- 6. Create helper functions
CREATE OR REPLACE FUNCTION get_studio_email_preferences(user_id_param UUID)
RETURNS TABLE (
    livestream_notifications BOOLEAN,
    streaming_limit_emails BOOLEAN,
    weekly_digest BOOLEAN,
    marketing_emails BOOLEAN,
    system_notifications BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(sep.livestream_notifications, true) as livestream_notifications,
        COALESCE(sep.streaming_limit_emails, true) as streaming_limit_emails,
        COALESCE(sep.weekly_digest, false) as weekly_digest,
        COALESCE(sep.marketing_emails, false) as marketing_emails,
        COALESCE(sep.system_notifications, true) as system_notifications
    FROM public.studio_email_preferences sep
    WHERE sep.user_id = user_id_param;
    
    -- If no preferences found, return defaults
    IF NOT FOUND THEN
        RETURN QUERY SELECT true, true, false, false, true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_studio_email_preferences(
    user_id_param UUID,
    livestream_notifications_param BOOLEAN DEFAULT NULL,
    streaming_limit_emails_param BOOLEAN DEFAULT NULL,
    weekly_digest_param BOOLEAN DEFAULT NULL,
    marketing_emails_param BOOLEAN DEFAULT NULL,
    system_notifications_param BOOLEAN DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.studio_email_preferences (
        user_id,
        livestream_notifications,
        streaming_limit_emails,
        weekly_digest,
        marketing_emails,
        system_notifications
    ) VALUES (
        user_id_param,
        COALESCE(livestream_notifications_param, true),
        COALESCE(streaming_limit_emails_param, true),
        COALESCE(weekly_digest_param, false),
        COALESCE(marketing_emails_param, false),
        COALESCE(system_notifications_param, true)
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        livestream_notifications = COALESCE(livestream_notifications_param, studio_email_preferences.livestream_notifications),
        streaming_limit_emails = COALESCE(streaming_limit_emails_param, studio_email_preferences.streaming_limit_emails),
        weekly_digest = COALESCE(weekly_digest_param, studio_email_preferences.weekly_digest),
        marketing_emails = COALESCE(marketing_emails_param, studio_email_preferences.marketing_emails),
        system_notifications = COALESCE(system_notifications_param, studio_email_preferences.system_notifications),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Migrate existing email preferences from verified_profiles (if they exist)
DO $$
BEGIN
    -- Check if email_preferences column exists in verified_profiles
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'verified_profiles' 
        AND column_name = 'email_preferences'
    ) THEN
        -- Migrate existing preferences
        INSERT INTO public.studio_email_preferences (
            user_id,
            livestream_notifications,
            streaming_limit_emails,
            weekly_digest,
            marketing_emails,
            system_notifications
        )
        SELECT 
            vp.id,
            COALESCE((vp.email_preferences->>'livestreamNotifications')::boolean, true),
            COALESCE((vp.email_preferences->>'streamingLimitEmails')::boolean, true),
            COALESCE((vp.email_preferences->>'weeklyDigest')::boolean, false),
            COALESCE((vp.email_preferences->>'marketingEmails')::boolean, false),
            COALESCE((vp.email_preferences->>'systemNotifications')::boolean, true)
        FROM public.verified_profiles vp
        WHERE vp.email_preferences IS NOT NULL
        AND vp.email_preferences != '{}'::jsonb
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Migrated existing email preferences from verified_profiles';
    END IF;
END $$;

-- 8. Create default preferences for users without any preferences
INSERT INTO public.studio_email_preferences (
    user_id,
    livestream_notifications,
    streaming_limit_emails,
    weekly_digest,
    marketing_emails,
    system_notifications
)
SELECT 
    vp.id,
    true,  -- livestream_notifications
    true,  -- streaming_limit_emails
    false, -- weekly_digest
    false, -- marketing_emails
    true   -- system_notifications
FROM public.verified_profiles vp
WHERE NOT EXISTS (
    SELECT 1 FROM public.studio_email_preferences sep 
    WHERE sep.user_id = vp.id
)
ON CONFLICT (user_id) DO NOTHING;

-- 9. Add comments for documentation
COMMENT ON TABLE public.studio_email_preferences IS 'User email notification preferences for BibleNOW Studio';
COMMENT ON COLUMN public.studio_email_preferences.user_id IS 'Reference to the user in verified_profiles';
COMMENT ON COLUMN public.studio_email_preferences.livestream_notifications IS 'Receive emails when followed streamers go live';
COMMENT ON COLUMN public.studio_email_preferences.streaming_limit_emails IS 'Receive emails about weekly streaming limits';
COMMENT ON COLUMN public.studio_email_preferences.weekly_digest IS 'Receive weekly summary emails';
COMMENT ON COLUMN public.studio_email_preferences.marketing_emails IS 'Receive marketing and promotional emails';
COMMENT ON COLUMN public.studio_email_preferences.system_notifications IS 'Receive system and account-related emails';

-- 10. Verify the setup
SELECT 'studio_email_preferences table created successfully!' as status;
SELECT COUNT(*) as total_preferences FROM public.studio_email_preferences;
SELECT COUNT(*) as total_users FROM public.verified_profiles;
