-- Create table for stream chat messages
CREATE TABLE public.stream_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playback_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stream_chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can view chat messages (public streams)
CREATE POLICY "Anyone can view stream chat messages"
ON public.stream_chat_messages
FOR SELECT
USING (true);

-- Authenticated users can send messages
CREATE POLICY "Authenticated users can send chat messages"
ON public.stream_chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.stream_chat_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_chat_messages;

-- Add index for faster queries by playback_id
CREATE INDEX idx_stream_chat_playback_id ON public.stream_chat_messages(playback_id, created_at DESC);