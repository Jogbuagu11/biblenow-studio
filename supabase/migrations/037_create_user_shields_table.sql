-- Create user_shields table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_shields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.verified_profiles(id) ON DELETE CASCADE,
  shielded_user_id UUID NOT NULL REFERENCES public.verified_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, shielded_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_shields_user_id ON public.user_shields(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shields_shielded_user_id ON public.user_shields(shielded_user_id);

-- Enable RLS
ALTER TABLE public.user_shields ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own shields" ON public.user_shields
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shields" ON public.user_shields
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shields" ON public.user_shields
  FOR DELETE USING (auth.uid() = user_id); 