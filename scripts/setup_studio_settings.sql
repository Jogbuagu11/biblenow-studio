-- Setup studio_settings table with required configuration
-- This is needed for the edge function calls to work

-- Check if settings exist
SELECT 'Current Settings' as check_type, key, value FROM public.studio_settings;

-- Insert required settings if they don't exist
INSERT INTO public.studio_settings (key, value, description, created_at, updated_at)
VALUES 
    ('supabase_url', 'https://your-project.supabase.co', 'Supabase project URL for edge function calls', NOW(), NOW()),
    ('service_role_key', 'your-service-role-key-here', 'Service role key for authenticated edge function calls', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
    updated_at = NOW();

-- Show the settings (without exposing the actual service key)
SELECT 
    'Settings Status' as check_type,
    key,
    CASE 
        WHEN key = 'service_role_key' THEN 
            CASE 
                WHEN LENGTH(value) > 10 THEN CONCAT(LEFT(value, 10), '...[HIDDEN]')
                ELSE '[NOT SET]'
            END
        ELSE value
    END as display_value,
    description,
    created_at
FROM public.studio_settings
ORDER BY key;
