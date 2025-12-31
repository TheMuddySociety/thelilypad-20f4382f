-- Create table for raffles
CREATE TABLE public.lily_raffles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  prize_type TEXT NOT NULL DEFAULT 'mixed', -- 'nft', 'token', 'shop_item', 'mixed'
  prize_details JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of prizes with details
  entry_price NUMERIC NOT NULL DEFAULT 0, -- MON cost per ticket
  max_tickets_per_user INTEGER DEFAULT 10,
  total_tickets INTEGER DEFAULT 0,
  required_collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL, -- NFT holder exclusive
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  winner_count INTEGER NOT NULL DEFAULT 1,
  winners JSONB DEFAULT '[]'::jsonb, -- Array of winner user IDs
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_drawn BOOLEAN NOT NULL DEFAULT false,
  drawn_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for raffle entries
CREATE TABLE public.lily_raffle_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raffle_id UUID NOT NULL REFERENCES public.lily_raffles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ticket_count INTEGER NOT NULL DEFAULT 1,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(raffle_id, user_id)
);

-- Create table for blind boxes
CREATE TABLE public.lily_blind_boxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  total_supply INTEGER NOT NULL DEFAULT 100,
  remaining_supply INTEGER NOT NULL DEFAULT 100,
  rewards JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of possible rewards with rarity weights
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_per_user INTEGER DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for blind box purchases
CREATE TABLE public.lily_blind_box_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blind_box_id UUID NOT NULL REFERENCES public.lily_blind_boxes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  rewards_received JSONB NOT NULL DEFAULT '[]'::jsonb, -- What the user got
  tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.lily_raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lily_raffle_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lily_blind_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lily_blind_box_purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for lily_raffles
CREATE POLICY "Anyone can view active raffles"
  ON public.lily_raffles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage all raffles"
  ON public.lily_raffles FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for lily_raffle_entries
CREATE POLICY "Users can view their own entries"
  ON public.lily_raffle_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can enter raffles"
  ON public.lily_raffle_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all entries"
  ON public.lily_raffle_entries FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all entries"
  ON public.lily_raffle_entries FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS policies for lily_blind_boxes
CREATE POLICY "Anyone can view active blind boxes"
  ON public.lily_blind_boxes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage all blind boxes"
  ON public.lily_blind_boxes FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for lily_blind_box_purchases
CREATE POLICY "Users can view their own purchases"
  ON public.lily_blind_box_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can make purchases"
  ON public.lily_blind_box_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases"
  ON public.lily_blind_box_purchases FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_lily_raffles_updated_at
  BEFORE UPDATE ON public.lily_raffles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lily_blind_boxes_updated_at
  BEFORE UPDATE ON public.lily_blind_boxes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_lily_raffles_active ON public.lily_raffles(is_active, end_date);
CREATE INDEX idx_lily_raffle_entries_raffle ON public.lily_raffle_entries(raffle_id);
CREATE INDEX idx_lily_raffle_entries_user ON public.lily_raffle_entries(user_id);
CREATE INDEX idx_lily_blind_boxes_active ON public.lily_blind_boxes(is_active, end_date);
CREATE INDEX idx_lily_blind_box_purchases_box ON public.lily_blind_box_purchases(blind_box_id);
CREATE INDEX idx_lily_blind_box_purchases_user ON public.lily_blind_box_purchases(user_id);