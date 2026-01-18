-- Create site_assets table for managing branding images via URLs
CREATE TABLE public.site_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_key TEXT NOT NULL UNIQUE,
  asset_url TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'image' CHECK (asset_type IN ('image', 'video')),
  page TEXT NOT NULL DEFAULT 'global',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_assets ENABLE ROW LEVEL SECURITY;

-- Allow public read access (branding images should be publicly visible)
CREATE POLICY "Site assets are publicly readable"
ON public.site_assets
FOR SELECT
USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage site assets"
ON public.site_assets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for fast lookups by key
CREATE INDEX idx_site_assets_key ON public.site_assets(asset_key);

-- Create trigger for updated_at
CREATE TRIGGER update_site_assets_updated_at
BEFORE UPDATE ON public.site_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();