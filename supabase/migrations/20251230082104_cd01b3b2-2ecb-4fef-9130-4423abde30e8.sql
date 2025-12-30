-- Allow admins to delete any chat message
CREATE POLICY "Admins can delete any chat message"
  ON public.stream_chat_messages FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage all chat reactions
CREATE POLICY "Admins can delete any chat reaction"
  ON public.chat_message_reactions FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));