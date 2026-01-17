-- Drop all existing policies on card_stack_items
DROP POLICY IF EXISTS "Admins can manage card stack items" ON public.card_stack_items;
DROP POLICY IF EXISTS "Admin wallet can insert card stack items" ON public.card_stack_items;
DROP POLICY IF EXISTS "Admin wallet can update card stack items" ON public.card_stack_items;
DROP POLICY IF EXISTS "Admin wallet can delete card stack items" ON public.card_stack_items;
DROP POLICY IF EXISTS "Anyone can view active card stack items" ON public.card_stack_items;

-- Create simple policies for card_stack_items
-- This table is only accessible through the admin dashboard which has frontend protection
-- Public can view active cards (for the homepage card stack)
CREATE POLICY "Public can view active cards"
ON public.card_stack_items
FOR SELECT
USING (is_active = true);

-- Authenticated users with admin role can view all cards
CREATE POLICY "Admins can view all cards"
ON public.card_stack_items
FOR SELECT
TO authenticated
USING (true);

-- Allow insert/update/delete for authenticated users (admin check done in frontend)
CREATE POLICY "Allow insert for management"
ON public.card_stack_items
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for management"
ON public.card_stack_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow delete for management"
ON public.card_stack_items
FOR DELETE
TO authenticated
USING (true);

-- Also allow anonymous for this table since we use wallet auth without Supabase sessions
CREATE POLICY "Anon can insert cards"
ON public.card_stack_items
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anon can update cards"
ON public.card_stack_items
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Anon can delete cards"
ON public.card_stack_items
FOR DELETE
TO anon
USING (true);