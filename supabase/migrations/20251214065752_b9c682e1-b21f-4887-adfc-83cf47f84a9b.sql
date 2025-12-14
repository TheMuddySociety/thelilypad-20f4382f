-- Create streams table to track stream sessions
CREATE TABLE public.streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stream_key_id UUID REFERENCES public.stream_keys(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Stream',
  category TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  peak_viewers INTEGER NOT NULL DEFAULT 0,
  total_views INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  is_live BOOLEAN NOT NULL DEFAULT false,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stream_analytics table for detailed metrics
CREATE TABLE public.stream_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES public.streams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  concurrent_viewers INTEGER NOT NULL DEFAULT 0,
  chat_messages INTEGER NOT NULL DEFAULT 0,
  new_followers INTEGER NOT NULL DEFAULT 0
);

-- Create earnings table for tracking creator revenue
CREATE TABLE public.earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stream_id UUID REFERENCES public.streams(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  type TEXT NOT NULL CHECK (type IN ('donation', 'subscription', 'bits', 'sponsorship')),
  from_user_id UUID,
  from_username TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create followers table
CREATE TABLE public.followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID NOT NULL,
  follower_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(streamer_id, follower_id)
);

-- Enable RLS on all tables
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Streams policies
CREATE POLICY "Users can view their own streams" 
ON public.streams FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own streams" 
ON public.streams FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streams" 
ON public.streams FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Public can view live streams" 
ON public.streams FOR SELECT USING (is_live = true);

-- Stream analytics policies
CREATE POLICY "Users can view their own analytics" 
ON public.stream_analytics FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics" 
ON public.stream_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Earnings policies
CREATE POLICY "Users can view their own earnings" 
ON public.earnings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert earnings for themselves" 
ON public.earnings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Followers policies
CREATE POLICY "Users can view their followers" 
ON public.followers FOR SELECT USING (auth.uid() = streamer_id);

CREATE POLICY "Users can see who they follow" 
ON public.followers FOR SELECT USING (auth.uid() = follower_id);

CREATE POLICY "Users can follow streamers" 
ON public.followers FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" 
ON public.followers FOR DELETE USING (auth.uid() = follower_id);