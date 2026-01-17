-- Create site_assets table
CREATE TABLE IF NOT EXISTS public.site_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_key TEXT NOT NULL UNIQUE,
    asset_url TEXT NOT NULL,
    asset_type TEXT NOT NULL, -- 'image', 'video'
    page TEXT, -- 'landing', 'footer', 'global'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.site_assets ENABLE ROW LEVEL SECURITY;

-- Policy: Public Read
CREATE POLICY "Public can view site assets"
ON public.site_assets
FOR SELECT
USING (true);

-- Policy: Admins can manage site assets
-- Note: we use has_role function which checks user roles
CREATE POLICY "Admins can insert site assets"
ON public.site_assets
FOR INSERT
WITH CHECK (
  public.has_role('admin', auth.uid()) OR 
  public.has_role('moderator', auth.uid())
);

CREATE POLICY "Admins can update site assets"
ON public.site_assets
FOR UPDATE
USING (
  public.has_role('admin', auth.uid()) OR 
  public.has_role('moderator', auth.uid())
)
WITH CHECK (
  public.has_role('admin', auth.uid()) OR 
  public.has_role('moderator', auth.uid())
);

CREATE POLICY "Admins can delete site assets"
ON public.site_assets
FOR DELETE
USING (
  public.has_role('admin', auth.uid()) OR 
  public.has_role('moderator', auth.uid())
);
