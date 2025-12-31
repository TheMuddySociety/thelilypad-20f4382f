-- Create volume rewards table for tracking trader rewards
CREATE TABLE public.volume_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reward_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  reward_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  rank INTEGER NOT NULL,
  weighted_volume NUMERIC NOT NULL DEFAULT 0,
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMP WITH TIME ZONE,
  claim_tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint for user per period
CREATE UNIQUE INDEX volume_rewards_user_period_idx ON public.volume_rewards (user_id, reward_period_start, reward_period_end);

-- Create index for faster queries
CREATE INDEX volume_rewards_user_id_idx ON public.volume_rewards (user_id);
CREATE INDEX volume_rewards_period_idx ON public.volume_rewards (reward_period_start, reward_period_end);

-- Enable RLS
ALTER TABLE public.volume_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own rewards"
  ON public.volume_rewards
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can claim their own rewards"
  ON public.volume_rewards
  FOR UPDATE
  USING (auth.uid() = user_id AND is_claimed = false);

CREATE POLICY "Admins can manage all rewards"
  ON public.volume_rewards
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage rewards"
  ON public.volume_rewards
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add trigger for updated_at
CREATE TRIGGER update_volume_rewards_updated_at
  BEFORE UPDATE ON public.volume_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();