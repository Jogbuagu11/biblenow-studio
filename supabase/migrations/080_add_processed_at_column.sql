-- Add processed_at and is_read columns to studio_notifications table
ALTER TABLE public.studio_notifications 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
