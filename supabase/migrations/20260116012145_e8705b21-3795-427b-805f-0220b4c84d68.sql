-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view stream chat messages" ON public.stream_chat_messages;

-- Create new policy requiring authentication to view chat messages
CREATE POLICY "Authenticated users can view stream chat messages" 
ON public.stream_chat_messages 
FOR SELECT 
TO authenticated
USING (true);