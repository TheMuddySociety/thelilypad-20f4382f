-- Create testimonials table for landing page Twitter cards
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  handle TEXT NOT NULL,
  content TEXT NOT NULL,
  avatar_url TEXT,
  verified BOOLEAN DEFAULT false,
  likes INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  tweet_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for active testimonials
CREATE INDEX IF NOT EXISTS idx_testimonials_active ON public.testimonials(is_active, display_order);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Public can view active testimonials
CREATE POLICY "Anyone can view active testimonials"
ON public.testimonials FOR SELECT
USING (is_active = true);

-- Admins can manage testimonials
CREATE POLICY "Admins can manage testimonials"
ON public.testimonials FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
);

-- Insert default testimonials
INSERT INTO public.testimonials (username, handle, content, avatar_url, verified, likes, retweets, tweet_url, display_order, is_active) VALUES
('Sarah Chen', '@sarahchen', 'This component is exactly what I needed for my landing page. The stacked effect is beautiful! 🎨', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', true, 42, 8, 'https://x.com', 1, true),
('Mike Johnson', '@mikej_dev', 'The hover interactions are so smooth. Love how the cards spread apart to reveal the ones behind. Great UX thinking!', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', true, 28, 5, 'https://x.com', 2, true),
('Alex Rivera', '@alexrivera', 'Finally a testimonial component that looks native to Twitter/X! Dark mode support is chef''s kiss 👨‍🍳', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', true, 156, 23, 'https://x.com', 3, true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_testimonials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_testimonials_updated_at_trigger
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_testimonials_updated_at();
