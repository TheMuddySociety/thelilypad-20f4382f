-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update collections policies to allow admin access
CREATE POLICY "Admins can manage all collections"
ON public.collections FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update allowlist_entries policies for admin
CREATE POLICY "Admins can manage all allowlist entries"
ON public.allowlist_entries FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update minted_nfts policies for admin
CREATE POLICY "Admins can manage all minted NFTs"
ON public.minted_nfts FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update nft_listings policies for admin
CREATE POLICY "Admins can manage all listings"
ON public.nft_listings FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update nft_offers policies for admin
CREATE POLICY "Admins can manage all offers"
ON public.nft_offers FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update shop_items policies for admin
CREATE POLICY "Admins can manage all shop items"
ON public.shop_items FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update shop_item_contents policies for admin
CREATE POLICY "Admins can manage all shop item contents"
ON public.shop_item_contents FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update streamer_profiles policies for admin
CREATE POLICY "Admins can manage all streamer profiles"
ON public.streamer_profiles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update streams policies for admin
CREATE POLICY "Admins can manage all streams"
ON public.streams FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update stream_keys policies for admin
CREATE POLICY "Admins can manage all stream keys"
ON public.stream_keys FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update channel_emotes policies for admin
CREATE POLICY "Admins can manage all channel emotes"
ON public.channel_emotes FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update clips policies for admin
CREATE POLICY "Admins can manage all clips"
ON public.clips FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update moderation_queue policies for admin
CREATE POLICY "Admins can manage moderation queue"
ON public.moderation_queue FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update moderation_actions policies for admin
CREATE POLICY "Admins can manage moderation actions"
ON public.moderation_actions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update blocked_patterns policies for admin
CREATE POLICY "Admins can manage blocked patterns"
ON public.blocked_patterns FOR ALL
USING (public.has_role(auth.uid(), 'admin'));