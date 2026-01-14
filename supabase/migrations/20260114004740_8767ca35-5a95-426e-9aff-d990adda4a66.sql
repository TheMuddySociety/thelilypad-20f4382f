-- Create card_stack_items table for admin-managed CardStack content
CREATE TABLE public.card_stack_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  href TEXT,
  cta_label TEXT,
  tag TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.card_stack_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read active items
CREATE POLICY "Anyone can view active card stack items"
  ON public.card_stack_items
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage (via has_role function)
CREATE POLICY "Admins can manage card stack items"
  ON public.card_stack_items
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_card_stack_items_updated_at
  BEFORE UPDATE ON public.card_stack_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_stack_items;