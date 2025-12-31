-- Create challenge badges table
CREATE TABLE public.challenge_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  description TEXT,
  challenge_id UUID REFERENCES public.streak_challenges(id),
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.challenge_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own badges"
ON public.challenge_badges FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view all badges for leaderboard"
ON public.challenge_badges FOR SELECT
USING (true);

CREATE POLICY "Service role can manage badges"
ON public.challenge_badges FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create index for quick lookups
CREATE INDEX idx_challenge_badges_user ON public.challenge_badges(user_id);
CREATE INDEX idx_challenge_badges_type ON public.challenge_badges(badge_type);