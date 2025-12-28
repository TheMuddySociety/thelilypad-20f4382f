-- Create banned_users table
CREATE TABLE public.banned_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    reason text,
    banned_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

-- Only admins can manage banned users
CREATE POLICY "Admins can view banned users"
ON public.banned_users FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can ban users"
ON public.banned_users FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bans"
ON public.banned_users FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can unban users"
ON public.banned_users FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create a function to check if a user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.banned_users
    WHERE user_id = _user_id
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;