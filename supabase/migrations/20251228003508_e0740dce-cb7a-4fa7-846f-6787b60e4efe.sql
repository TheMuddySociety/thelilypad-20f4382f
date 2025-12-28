-- Create table for channel emotes
CREATE TABLE public.channel_emotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.channel_emotes ENABLE ROW LEVEL SECURITY;

-- Anyone can view active emotes
CREATE POLICY "Anyone can view active channel emotes"
ON public.channel_emotes
FOR SELECT
USING (is_active = true);

-- Streamers can view all their own emotes
CREATE POLICY "Streamers can view their own emotes"
ON public.channel_emotes
FOR SELECT
USING (auth.uid() = streamer_id);

-- Streamers can create their own emotes
CREATE POLICY "Streamers can create their own emotes"
ON public.channel_emotes
FOR INSERT
WITH CHECK (auth.uid() = streamer_id);

-- Streamers can update their own emotes
CREATE POLICY "Streamers can update their own emotes"
ON public.channel_emotes
FOR UPDATE
USING (auth.uid() = streamer_id);

-- Streamers can delete their own emotes
CREATE POLICY "Streamers can delete their own emotes"
ON public.channel_emotes
FOR DELETE
USING (auth.uid() = streamer_id);

-- Add trigger for updated_at
CREATE TRIGGER update_channel_emotes_updated_at
BEFORE UPDATE ON public.channel_emotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for channel emotes
INSERT INTO storage.buckets (id, name, public) VALUES ('channel-emotes', 'channel-emotes', true);

-- Storage policies for channel emotes
CREATE POLICY "Anyone can view channel emotes"
ON storage.objects FOR SELECT
USING (bucket_id = 'channel-emotes');

CREATE POLICY "Authenticated users can upload channel emotes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'channel-emotes' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own channel emotes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'channel-emotes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own channel emotes"
ON storage.objects FOR DELETE
USING (bucket_id = 'channel-emotes' AND auth.uid()::text = (storage.foldername(name))[1]);