-- Create streak challenges table
CREATE TABLE public.streak_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id UUID NOT NULL,
  challenged_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  challenger_streak INTEGER NOT NULL DEFAULT 0,
  challenged_streak INTEGER NOT NULL DEFAULT 0,
  winner_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_users CHECK (challenger_id != challenged_id)
);

-- Enable RLS
ALTER TABLE public.streak_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view challenges they're part of"
ON public.streak_challenges FOR SELECT
USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

CREATE POLICY "Users can create challenges"
ON public.streak_challenges FOR INSERT
WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Participants can update their challenges"
ON public.streak_challenges FOR UPDATE
USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

CREATE POLICY "Challengers can delete pending challenges"
ON public.streak_challenges FOR DELETE
USING (auth.uid() = challenger_id AND status = 'pending');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.streak_challenges;