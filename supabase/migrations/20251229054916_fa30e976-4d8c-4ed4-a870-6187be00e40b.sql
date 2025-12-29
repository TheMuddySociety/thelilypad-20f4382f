-- Create featured_collections table for admin-curated slideshows
CREATE TABLE public.featured_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL CHECK (feature_type IN ('monthly', 'weekly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  
  -- Ensure no duplicate collection in same feature type and period
  UNIQUE (collection_id, feature_type, start_date)
);

-- Enable RLS
ALTER TABLE public.featured_collections ENABLE ROW LEVEL SECURITY;

-- Everyone can view featured collections (public showcase)
CREATE POLICY "Anyone can view featured collections"
ON public.featured_collections
FOR SELECT
USING (is_active = true);

-- Only admins can manage featured collections
CREATE POLICY "Admins can manage featured collections"
ON public.featured_collections
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index for efficient queries
CREATE INDEX idx_featured_collections_active ON public.featured_collections(feature_type, is_active, start_date, end_date);
CREATE INDEX idx_featured_collections_display ON public.featured_collections(feature_type, display_order);