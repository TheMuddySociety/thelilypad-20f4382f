-- Create enum for content types
CREATE TYPE public.moderation_content_type AS ENUM ('text', 'image', 'collection_name', 'collection_description', 'trait_name', 'comment');

-- Create enum for moderation status
CREATE TYPE public.moderation_status AS ENUM ('pending', 'approved', 'rejected', 'auto_rejected', 'auto_approved');

-- Create enum for moderation reason
CREATE TYPE public.moderation_reason AS ENUM ('nsfw', 'violence', 'hate_speech', 'spam', 'harassment', 'illegal', 'other', 'clean');

-- Create moderation queue table
CREATE TABLE public.moderation_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type moderation_content_type NOT NULL,
  content_text TEXT,
  content_url TEXT,
  reference_id TEXT,
  reference_table TEXT,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status moderation_status NOT NULL DEFAULT 'pending',
  ai_score NUMERIC(5, 4),
  ai_reasons moderation_reason[] DEFAULT '{}',
  ai_details JSONB DEFAULT '{}',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create moderation actions log table
CREATE TABLE public.moderation_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_id UUID REFERENCES public.moderation_queue(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  previous_status moderation_status,
  new_status moderation_status,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blocked content patterns table for quick filtering
CREATE TABLE public.blocked_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern TEXT NOT NULL,
  pattern_type TEXT NOT NULL DEFAULT 'keyword',
  reason moderation_reason NOT NULL DEFAULT 'nsfw',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_patterns ENABLE ROW LEVEL SECURITY;

-- RLS policies for moderation_queue
CREATE POLICY "Users can view their own submissions"
ON public.moderation_queue
FOR SELECT
USING (auth.uid() = submitted_by);

CREATE POLICY "Users can submit content for moderation"
ON public.moderation_queue
FOR INSERT
WITH CHECK (auth.uid() = submitted_by);

-- RLS policies for moderation_actions (only viewable by action taker for now)
CREATE POLICY "Users can view their own actions"
ON public.moderation_actions
FOR SELECT
USING (auth.uid() = action_by);

-- Blocked patterns readable by all authenticated users for client-side filtering
CREATE POLICY "Authenticated users can view active blocked patterns"
ON public.blocked_patterns
FOR SELECT
TO authenticated
USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_moderation_queue_updated_at
BEFORE UPDATE ON public.moderation_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes
CREATE INDEX idx_moderation_queue_status ON public.moderation_queue(status);
CREATE INDEX idx_moderation_queue_submitted_by ON public.moderation_queue(submitted_by);
CREATE INDEX idx_moderation_queue_content_type ON public.moderation_queue(content_type);
CREATE INDEX idx_moderation_actions_queue_id ON public.moderation_actions(queue_id);

-- Insert some default blocked patterns for NSFW content
INSERT INTO public.blocked_patterns (pattern, pattern_type, reason) VALUES
('nsfw', 'keyword', 'nsfw'),
('xxx', 'keyword', 'nsfw'),
('porn', 'keyword', 'nsfw'),
('nude', 'keyword', 'nsfw'),
('naked', 'keyword', 'nsfw'),
('explicit', 'keyword', 'nsfw'),
('adult only', 'keyword', 'nsfw'),
('18+', 'keyword', 'nsfw');