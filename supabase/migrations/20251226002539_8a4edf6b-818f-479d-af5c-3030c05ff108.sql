-- Create collections table for NFT launchpad
CREATE TABLE public.collections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL,
  creator_address text NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL,
  description text,
  image_url text,
  total_supply integer NOT NULL DEFAULT 0,
  minted integer NOT NULL DEFAULT 0,
  royalty_percent numeric NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'ended')),
  phases jsonb NOT NULL DEFAULT '[]'::jsonb,
  layers_metadata jsonb,
  trait_rules jsonb,
  contract_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Anyone can view collections (public marketplace)
CREATE POLICY "Anyone can view collections"
  ON public.collections
  FOR SELECT
  USING (true);

-- Creators can insert their own collections
CREATE POLICY "Creators can insert their own collections"
  ON public.collections
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Creators can update their own collections
CREATE POLICY "Creators can update their own collections"
  ON public.collections
  FOR UPDATE
  USING (auth.uid() = creator_id);

-- Creators can delete their own collections
CREATE POLICY "Creators can delete their own collections"
  ON public.collections
  FOR DELETE
  USING (auth.uid() = creator_id);

-- Create updated_at trigger
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_collections_creator ON public.collections(creator_id);
CREATE INDEX idx_collections_status ON public.collections(status);