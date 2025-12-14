-- Create stream_keys table for storing user stream keys
CREATE TABLE public.stream_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stream_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  name TEXT NOT NULL DEFAULT 'My Stream',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.stream_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own stream keys" 
ON public.stream_keys 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stream keys" 
ON public.stream_keys 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stream keys" 
ON public.stream_keys 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stream keys" 
ON public.stream_keys 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_stream_keys_updated_at
BEFORE UPDATE ON public.stream_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();