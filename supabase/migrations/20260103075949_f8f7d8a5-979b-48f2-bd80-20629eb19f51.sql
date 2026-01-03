-- Create feature_locks table for configurable feature requirements
CREATE TABLE public.feature_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  feature_name text NOT NULL,
  description text,
  required_followers integer DEFAULT 0,
  required_subscribers integer DEFAULT 0,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_locks ENABLE ROW LEVEL SECURITY;

-- Anyone can read feature lock settings
CREATE POLICY "Anyone can view feature locks"
  ON public.feature_locks FOR SELECT
  USING (true);

-- Only admins can manage feature locks
CREATE POLICY "Admins can manage feature locks"
  ON public.feature_locks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_feature_locks_updated_at
  BEFORE UPDATE ON public.feature_locks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default feature locks
INSERT INTO public.feature_locks (feature_key, feature_name, description, required_followers) VALUES
  ('sticker_packs', 'Sticker Pack Creation', 'Allow creators to create and sell sticker packs', 100),
  ('channel_emotes', 'Channel Emotes', 'Allow streamers to create custom channel emotes', 50);