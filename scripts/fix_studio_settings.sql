-- Fix studio_settings with correct Supabase configuration
-- You need to replace these values with your actual Supabase project details

-- First, check current settings
SELECT 'Current Settings' as status, key, 
    CASE 
        WHEN key = 'service_role_key' THEN CONCAT(LEFT(value, 20), '...[HIDDEN]')
        ELSE value 
    END as display_value
FROM public.studio_settings;

-- Update with correct values (REPLACE THESE WITH YOUR ACTUAL VALUES)
INSERT INTO public.studio_settings (key, value, description, created_at, updated_at)
VALUES 
    (
        'supabase_url', 
        'https://jhlawjmyorpmafokxtuh.supabase.co', 
        'Supabase project URL for edge function calls', 
        NOW(), 
        NOW()
    ),
    (
        'service_role_key', 
        'YOUR_ACTUAL_SERVICE_ROLE_KEY_HERE', 
        'Service role key for authenticated edge function calls', 
        NOW(), 
        NOW()
    )
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Verify settings are updated (without showing the full key)
SELECT 'Updated Settings' as status, key,
    CASE 
        WHEN key = 'service_role_key' THEN 
            CASE 
                WHEN LENGTH(value) > 50 THEN CONCAT(LEFT(value, 20), '...[VALID KEY SET]')
                ELSE '[INVALID - TOO SHORT]'
            END
        ELSE value 
    END as display_value
FROM public.studio_settings
ORDER BY key;
