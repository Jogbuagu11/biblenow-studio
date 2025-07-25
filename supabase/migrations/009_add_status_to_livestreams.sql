-- Add status column to livestreams table
ALTER TABLE public.livestreams 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'ended', 'scheduled')); 