-- Create allowlist entries table for NFT minting phases
CREATE TABLE public.allowlist_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL,
  phase_name TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  max_mint INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  notes TEXT,
  UNIQUE(collection_id, phase_name, wallet_address)
);

-- Enable Row Level Security
ALTER TABLE public.allowlist_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for allowlist management
CREATE POLICY "Users can view their own allowlist entries"
ON public.allowlist_entries
FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can create allowlist entries"
ON public.allowlist_entries
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own allowlist entries"
ON public.allowlist_entries
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own allowlist entries"
ON public.allowlist_entries
FOR DELETE
USING (auth.uid() = created_by);

-- Create index for faster lookups
CREATE INDEX idx_allowlist_collection_phase ON public.allowlist_entries(collection_id, phase_name);
CREATE INDEX idx_allowlist_wallet ON public.allowlist_entries(wallet_address);