-- Create shop_bundles table for bundle deals
CREATE TABLE public.shop_bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  discount_percent INTEGER NOT NULL DEFAULT 10,
  original_price NUMERIC NOT NULL DEFAULT 0,
  bundle_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create shop_bundle_items junction table
CREATE TABLE public.shop_bundle_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.shop_bundles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bundle_id, item_id)
);

-- Create shop_bundle_purchases table to track bundle purchases
CREATE TABLE public.shop_bundle_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.shop_bundles(id),
  user_id UUID NOT NULL,
  price_paid NUMERIC NOT NULL,
  tx_hash TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.shop_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_bundle_purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for shop_bundles
CREATE POLICY "Anyone can view active bundles"
  ON public.shop_bundles
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage all bundles"
  ON public.shop_bundles
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for shop_bundle_items
CREATE POLICY "Anyone can view bundle items for active bundles"
  ON public.shop_bundle_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.shop_bundles
    WHERE shop_bundles.id = shop_bundle_items.bundle_id
    AND shop_bundles.is_active = true
  ));

CREATE POLICY "Admins can manage all bundle items"
  ON public.shop_bundle_items
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for shop_bundle_purchases
CREATE POLICY "Users can view their own bundle purchases"
  ON public.shop_bundle_purchases
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bundle purchases"
  ON public.shop_bundle_purchases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_shop_bundles_updated_at
  BEFORE UPDATE ON public.shop_bundles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();