
-- Waitroom chat messages
CREATE TABLE public.waitroom_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  display_name text,
  avatar_url text,
  wallet_address text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waitroom_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view waitroom messages"
  ON public.waitroom_messages FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON public.waitroom_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON public.waitroom_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all waitroom messages"
  ON public.waitroom_messages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for waitroom
ALTER PUBLICATION supabase_realtime ADD TABLE public.waitroom_messages;

-- Referral / affiliate system
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral code"
  ON public.referral_codes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own referral code"
  ON public.referral_codes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can look up a referral code"
  ON public.referral_codes FOR SELECT TO authenticated
  USING (true);

-- Referral tracking
CREATE TABLE public.referral_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  referral_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referred_user_id)
);

ALTER TABLE public.referral_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
  ON public.referral_signups FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY "System can insert referral signups"
  ON public.referral_signups FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view referral leaderboard data"
  ON public.referral_signups FOR SELECT TO authenticated
  USING (true);

-- Streamer applications (separate from creator_beta_applications)
CREATE TABLE public.streamer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  email text NOT NULL,
  content_type text NOT NULL,
  platform_links text[] NOT NULL DEFAULT '{}',
  schedule_description text,
  motivation text,
  social_links jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.streamer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants create own streamer application"
  ON public.streamer_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Applicants view own streamer application"
  ON public.streamer_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Applicants update pending streamer application"
  ON public.streamer_applications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending', 'reviewing'))
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'reviewing'));

CREATE POLICY "Admins have full access to streamer applications"
  ON public.streamer_applications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add referral_code column to user_profiles for tracking who referred them
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS referred_by text;
