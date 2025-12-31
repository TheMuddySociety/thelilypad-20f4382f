-- Create buyback program collections table to track admin-selected collections
CREATE TABLE public.buyback_program_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  added_by UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notified_creator BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(collection_id)
);

-- Enable RLS
ALTER TABLE public.buyback_program_collections ENABLE ROW LEVEL SECURITY;

-- Anyone can view buyback program collections
CREATE POLICY "Anyone can view buyback program collections"
ON public.buyback_program_collections
FOR SELECT
USING (is_active = true);

-- Admins can manage buyback program collections
CREATE POLICY "Admins can manage buyback program"
ON public.buyback_program_collections
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add index for performance
CREATE INDEX idx_buyback_program_collection ON public.buyback_program_collections(collection_id);
CREATE INDEX idx_buyback_program_active ON public.buyback_program_collections(is_active);