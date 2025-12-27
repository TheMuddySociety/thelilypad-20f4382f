
-- Create shop_items table for sticker/emoji packs
CREATE TABLE public.shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'sticker_pack',
  tier TEXT NOT NULL DEFAULT 'basic',
  price_mon DECIMAL NOT NULL DEFAULT 0,
  creator_type TEXT NOT NULL DEFAULT 'creator',
  required_collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_sales INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create shop_item_contents table for individual stickers/emojis
CREATE TABLE public.shop_item_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create shop_purchases table for tracking purchases
CREATE TABLE public.shop_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  price_paid DECIMAL NOT NULL,
  tx_hash TEXT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Create storage bucket for shop items
INSERT INTO storage.buckets (id, name, public) VALUES ('shop-items', 'shop-items', true);

-- Enable RLS on all tables
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_item_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for shop_items
CREATE POLICY "Anyone can view active shop items"
ON public.shop_items FOR SELECT
USING (is_active = true);

CREATE POLICY "Creators can view their own items"
ON public.shop_items FOR SELECT
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can insert their own items"
ON public.shop_items FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own items"
ON public.shop_items FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their own items"
ON public.shop_items FOR DELETE
USING (auth.uid() = creator_id);

-- RLS policies for shop_item_contents
CREATE POLICY "Anyone can view contents of active items"
ON public.shop_item_contents FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.shop_items 
  WHERE id = item_id AND is_active = true
));

CREATE POLICY "Creators can view their item contents"
ON public.shop_item_contents FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.shop_items 
  WHERE id = item_id AND creator_id = auth.uid()
));

CREATE POLICY "Creators can insert contents for their items"
ON public.shop_item_contents FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.shop_items 
  WHERE id = item_id AND creator_id = auth.uid()
));

CREATE POLICY "Creators can update contents for their items"
ON public.shop_item_contents FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.shop_items 
  WHERE id = item_id AND creator_id = auth.uid()
));

CREATE POLICY "Creators can delete contents for their items"
ON public.shop_item_contents FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.shop_items 
  WHERE id = item_id AND creator_id = auth.uid()
));

-- RLS policies for shop_purchases
CREATE POLICY "Users can view their own purchases"
ON public.shop_purchases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Item creators can view purchases of their items"
ON public.shop_purchases FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.shop_items 
  WHERE id = item_id AND creator_id = auth.uid()
));

CREATE POLICY "Users can insert their own purchases"
ON public.shop_purchases FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Storage policies for shop-items bucket
CREATE POLICY "Anyone can view shop item files"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-items');

CREATE POLICY "Authenticated users can upload shop item files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shop-items' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own shop item files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'shop-items' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own shop item files"
ON storage.objects FOR DELETE
USING (bucket_id = 'shop-items' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add trigger for updated_at on shop_items
CREATE TRIGGER update_shop_items_updated_at
BEFORE UPDATE ON public.shop_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
