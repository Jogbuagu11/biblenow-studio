-- Add authentication fields to existing verified_profiles table

-- Add password field for authentication
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Add role field for user roles
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin'));

-- Add status field for account status
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));

-- Add last_login field
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Add avatar_url field
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add bio field
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add preferences field
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Add updated_at field
ALTER TABLE public.verified_profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_verified_profiles_email ON public.verified_profiles(email);
CREATE INDEX IF NOT EXISTS idx_verified_profiles_role ON public.verified_profiles(role);
CREATE INDEX IF NOT EXISTS idx_verified_profiles_status ON public.verified_profiles(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_verified_profiles_updated_at ON public.verified_profiles;
CREATE TRIGGER update_verified_profiles_updated_at
  BEFORE UPDATE ON public.verified_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update existing records to have default values
UPDATE public.verified_profiles 
SET 
  role = COALESCE(role, 'user'),
  status = COALESCE(status, 'active'),
  preferences = COALESCE(preferences, '{}'::jsonb)
WHERE role IS NULL OR status IS NULL OR preferences IS NULL;

-- Insert default moderator user if not exists
INSERT INTO public.verified_profiles (
  id, 
  email, 
  password, 
  first_name, 
  last_name, 
  role, 
  status, 
  ministry_name,
  created_at
)
VALUES (
  gen_random_uuid(),
  'mrs.ogbuagu@gmail.com',
  'admin123', -- In production, use proper password hashing
  'Mrs.',
  'Ogbuagu',
  'moderator',
  'active',
  'BibleNOW',
  NOW()
) ON CONFLICT (email) DO NOTHING; 