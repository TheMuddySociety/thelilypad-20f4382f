-- Platform Fees Table - Track all platform fees collected
CREATE TABLE public.platform_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
  shop_item_id UUID REFERENCES public.shop_items(id) ON DELETE SET NULL,
  tx_hash TEXT NOT NULL,
  fee_amount NUMERIC NOT NULL DEFAULT 0,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('mint', 'sale', 'offer', 'listing', 'sticker', 'emote', 'emoji')),
  source_volume NUMERIC NOT NULL DEFAULT 0,
  contributed_to_buyback NUMERIC NOT NULL DEFAULT 0,
  chain TEXT NOT NULL DEFAULT 'monad',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Buyback Events Table - Track all buyback executions
CREATE TABLE public.buyback_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_volume NUMERIC NOT NULL,
  mon_spent NUMERIC NOT NULL,
  tokens_bought NUMERIC NOT NULL DEFAULT 0,
  token_address TEXT,
  tx_hash TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Volume Tracking Table - Track volume from different sources
CREATE TABLE public.volume_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('nft_sell', 'nft_buy', 'offer', 'listing', 'sticker', 'emote', 'emoji')),
  volume_amount NUMERIC NOT NULL DEFAULT 0,
  weight NUMERIC NOT NULL DEFAULT 1.0,
  weighted_volume NUMERIC NOT NULL DEFAULT 0,
  tx_hash TEXT,
  collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
  user_id UUID,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('day', now()),
  period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('day', now()) + interval '1 day',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Buyback Pool Status Table - Track current buyback pool state
CREATE TABLE public.buyback_pool (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pool_balance NUMERIC NOT NULL DEFAULT 0,
  accumulated_volume NUMERIC NOT NULL DEFAULT 0,
  last_buyback_at TIMESTAMP WITH TIME ZONE,
  total_buybacks_executed INTEGER NOT NULL DEFAULT 0,
  buyback_threshold NUMERIC NOT NULL DEFAULT 100,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert initial buyback pool record
INSERT INTO public.buyback_pool (pool_balance, accumulated_volume, buyback_threshold)
VALUES (0, 0, 100);

-- Enable RLS on all new tables
ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volume_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyback_pool ENABLE ROW LEVEL SECURITY;

-- Platform Fees Policies
CREATE POLICY "Anyone can view platform fees"
ON public.platform_fees
FOR SELECT
USING (true);

CREATE POLICY "Service role can insert platform fees"
ON public.platform_fees
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Buyback Events Policies
CREATE POLICY "Anyone can view buyback events"
ON public.buyback_events
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage buyback events"
ON public.buyback_events
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Volume Tracking Policies
CREATE POLICY "Anyone can view volume tracking"
ON public.volume_tracking
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert volume"
ON public.volume_tracking
FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage volume"
ON public.volume_tracking
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Buyback Pool Policies
CREATE POLICY "Anyone can view buyback pool"
ON public.buyback_pool
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage buyback pool"
ON public.buyback_pool
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_platform_fees_collection ON public.platform_fees(collection_id);
CREATE INDEX idx_platform_fees_type ON public.platform_fees(fee_type);
CREATE INDEX idx_platform_fees_created ON public.platform_fees(created_at);
CREATE INDEX idx_volume_tracking_source ON public.volume_tracking(source_type);
CREATE INDEX idx_volume_tracking_period ON public.volume_tracking(period_start, period_end);
CREATE INDEX idx_buyback_events_executed ON public.buyback_events(executed_at);