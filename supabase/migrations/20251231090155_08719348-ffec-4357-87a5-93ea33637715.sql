-- Create user_nonces table for replay protection
CREATE TABLE public.user_nonces (
  user_address text PRIMARY KEY,
  nonce bigint NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_nonces ENABLE ROW LEVEL SECURITY;

-- Anyone can read nonces (needed for building transactions)
CREATE POLICY "Anyone can read nonces"
ON public.user_nonces
FOR SELECT
USING (true);

-- Service role can manage nonces (relayer will use service role)
CREATE POLICY "Service role can manage nonces"
ON public.user_nonces
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create meta_transactions table for tracking gasless transactions
CREATE TABLE public.meta_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_address text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('mint', 'list', 'offer', 'transfer', 'cancel')),
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  nonce bigint NOT NULL,
  typed_data jsonb NOT NULL,
  signature text NOT NULL,
  deadline timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'confirmed', 'failed', 'expired')),
  tx_hash text,
  error_message text,
  gas_used bigint,
  gas_paid_by text DEFAULT 'platform',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone
);

-- Create indexes for efficient queries
CREATE INDEX idx_meta_transactions_user_address ON public.meta_transactions(user_address);
CREATE INDEX idx_meta_transactions_status ON public.meta_transactions(status);
CREATE INDEX idx_meta_transactions_created_at ON public.meta_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.meta_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own meta transactions
CREATE POLICY "Users can view their own meta transactions"
ON public.meta_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own meta transactions
CREATE POLICY "Users can insert their own meta transactions"
ON public.meta_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role can manage all meta transactions (for relayer)
CREATE POLICY "Service role can manage meta transactions"
ON public.meta_transactions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Enable realtime for meta_transactions so UI can poll status
ALTER PUBLICATION supabase_realtime ADD TABLE public.meta_transactions;