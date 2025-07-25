-- Add category column to livestreams table
ALTER TABLE public.livestreams 
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'general'; 