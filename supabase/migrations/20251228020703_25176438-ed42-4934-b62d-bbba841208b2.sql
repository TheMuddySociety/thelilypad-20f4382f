-- Create transaction history table
CREATE TABLE public.nft_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  collection_id UUID REFERENCES public.collections(id),
  tx_hash TEXT NOT NULL,
  tx_type TEXT NOT NULL DEFAULT 'mint',
  quantity INTEGER NOT NULL DEFAULT 1,
  price_paid NUMERIC NOT NULL DEFAULT 0,
  token_ids INTEGER[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.nft_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
ON public.nft_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can insert their own transactions"
ON public.nft_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own transactions
CREATE POLICY "Users can update their own transactions"
ON public.nft_transactions
FOR UPDATE
USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_nft_transactions_user_id ON public.nft_transactions(user_id);
CREATE INDEX idx_nft_transactions_collection_id ON public.nft_transactions(collection_id);