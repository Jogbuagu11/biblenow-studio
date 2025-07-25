-- Update status constraint to use only 'active' and 'ended'
-- Remove the old constraint and add a new one with simplified values

-- 1. Remove the old constraint
ALTER TABLE public.livestreams 
DROP CONSTRAINT IF EXISTS livestreams_status_check;

-- 2. Add new constraint with only 'active' and 'ended'
ALTER TABLE public.livestreams 
ADD CONSTRAINT livestreams_status_check 
CHECK (status IN ('active', 'ended'));

-- 3. Update existing 'inactive' and 'scheduled' records to 'active'
UPDATE public.livestreams 
SET status = 'active' 
WHERE status IN ('inactive', 'scheduled');

-- 4. Update existing 'live' records to 'active' (since is_live handles live status)
UPDATE public.livestreams 
SET status = 'active' 
WHERE status = 'live';

-- 5. Set default to 'active' for new records
ALTER TABLE public.livestreams 
ALTER COLUMN status SET DEFAULT 'active';

-- 6. Verify the constraint
SELECT 
    status,
    COUNT(*) as count
FROM public.livestreams 
GROUP BY status
ORDER BY status; 