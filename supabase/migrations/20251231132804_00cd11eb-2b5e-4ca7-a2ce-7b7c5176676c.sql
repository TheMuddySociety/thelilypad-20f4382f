-- Add duration column to streak_challenges
ALTER TABLE public.streak_challenges 
ADD COLUMN duration_days INTEGER NOT NULL DEFAULT 7;

-- Add index for finding challenges that need to be resolved
CREATE INDEX idx_streak_challenges_status_end ON public.streak_challenges(status, end_date) 
WHERE status = 'active';