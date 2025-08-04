-- Create user_invite table for tracking invite history
CREATE TABLE IF NOT EXISTS public.user_invite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES public.verified_profiles(id) ON DELETE CASCADE,
  invitee_email VARCHAR(255) NOT NULL,
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_invite_inviter_id ON public.user_invite(inviter_id);
CREATE INDEX IF NOT EXISTS idx_user_invite_invitee_email ON public.user_invite(invitee_email);
CREATE INDEX IF NOT EXISTS idx_user_invite_status ON public.user_invite(status);
CREATE INDEX IF NOT EXISTS idx_user_invite_created_at ON public.user_invite(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_invite_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_invite_updated_at
  BEFORE UPDATE ON public.user_invite
  FOR EACH ROW
  EXECUTE FUNCTION update_user_invite_updated_at();

-- Enable RLS
ALTER TABLE public.user_invite ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own invites
CREATE POLICY "Users can view their own invites" ON public.user_invite
  FOR SELECT USING (auth.uid()::text = inviter_id::text);

-- Users can create invites
CREATE POLICY "Users can create invites" ON public.user_invite
  FOR INSERT WITH CHECK (auth.uid()::text = inviter_id::text);

-- Users can update their own invites
CREATE POLICY "Users can update their own invites" ON public.user_invite
  FOR UPDATE USING (auth.uid()::text = inviter_id::text);

-- Users can delete their own invites
CREATE POLICY "Users can delete their own invites" ON public.user_invite
  FOR DELETE USING (auth.uid()::text = inviter_id::text); 