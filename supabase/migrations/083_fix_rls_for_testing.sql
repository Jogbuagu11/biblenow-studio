-- Fix RLS policies for testing and notification system

-- Check current policies on livestream_weekly_usage
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'livestream_weekly_usage';

-- Add policy to allow authenticated users to insert/update their own usage data
CREATE POLICY IF NOT EXISTS "Users can manage their own weekly usage" 
ON public.livestream_weekly_usage
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add policy to allow service role to manage all usage data (for testing and system operations)
CREATE POLICY IF NOT EXISTS "Service role can manage all weekly usage" 
ON public.livestream_weekly_usage
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Check current policies on studio_notifications
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'studio_notifications';

-- Add policy to allow authenticated users to read their own notifications
CREATE POLICY IF NOT EXISTS "Users can read their own notifications" 
ON public.studio_notifications
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Add policy to allow service role to manage all notifications (for system operations)
CREATE POLICY IF NOT EXISTS "Service role can manage all notifications" 
ON public.studio_notifications
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Add policy to allow authenticated users to update their own notifications (mark as read)
CREATE POLICY IF NOT EXISTS "Users can update their own notifications" 
ON public.studio_notifications
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Verify the policies were created
SELECT 'RLS Policies Updated' as status, tablename, policyname, cmd, roles
FROM pg_policies 
WHERE tablename IN ('livestream_weekly_usage', 'studio_notifications')
ORDER BY tablename, policyname;
