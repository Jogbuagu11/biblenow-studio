-- Remove redundant owner_id column from livestreams table
-- Handle all possible dependencies before removing the column

-- Drop RLS policies that depend on owner_id
DROP POLICY IF EXISTS "Users can delete their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can insert their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can read their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Users can update their own livestreams" ON public.livestreams;
DROP POLICY IF EXISTS "Public can view livestreams" ON public.livestreams;

-- Drop any foreign key constraints that reference owner_id
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    -- Find and drop all foreign key constraints that reference owner_id
    FOR constraint_name IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'livestreams' 
        AND kcu.column_name = 'owner_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE 'ALTER TABLE public.livestreams DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END LOOP;
END $$;

-- Drop any check constraints that reference owner_id
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc 
            ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'livestreams' 
        AND cc.check_clause LIKE '%owner_id%'
    LOOP
        EXECUTE 'ALTER TABLE public.livestreams DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END LOOP;
END $$;

-- Drop any indexes on owner_id
DROP INDEX IF EXISTS idx_livestreams_owner_id;

-- Drop any unique constraints on owner_id
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'livestreams' 
        AND kcu.column_name = 'owner_id'
        AND tc.constraint_type = 'UNIQUE'
    LOOP
        EXECUTE 'ALTER TABLE public.livestreams DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END LOOP;
END $$;

-- Now remove the column
ALTER TABLE public.livestreams DROP COLUMN IF EXISTS owner_id;

-- Recreate RLS policies using streamer_id instead of owner_id
CREATE POLICY "Users can delete their own livestreams" ON public.livestreams
    FOR DELETE USING (auth.uid() = streamer_id);

CREATE POLICY "Users can insert their own livestreams" ON public.livestreams
    FOR INSERT WITH CHECK (auth.uid() = streamer_id);

CREATE POLICY "Users can read their own livestreams" ON public.livestreams
    FOR SELECT USING (auth.uid() = streamer_id);

CREATE POLICY "Users can update their own livestreams" ON public.livestreams
    FOR UPDATE USING (auth.uid() = streamer_id);

CREATE POLICY "Public can view livestreams" ON public.livestreams
    FOR SELECT USING (true); 