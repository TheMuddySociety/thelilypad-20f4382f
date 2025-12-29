-- Create notifications table for user notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can create notifications for any user
CREATE POLICY "Admins can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index for efficient queries
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

-- Create function to notify creator when collection is featured
CREATE OR REPLACE FUNCTION public.notify_featured_collection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  collection_name TEXT;
  collection_creator_id UUID;
  feature_label TEXT;
BEGIN
  -- Get collection details
  SELECT name, creator_id INTO collection_name, collection_creator_id
  FROM public.collections
  WHERE id = NEW.collection_id;

  -- Determine feature type label
  IF NEW.feature_type = 'monthly' THEN
    feature_label := 'Collection of the Month';
  ELSE
    feature_label := 'Weekly Spotlight';
  END IF;

  -- Insert notification for the creator
  IF collection_creator_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      collection_creator_id,
      'collection_featured',
      'Your Collection Was Featured!',
      'Congratulations! "' || collection_name || '" has been selected as a ' || feature_label || ' on The Lily Pad.',
      '/collection/' || NEW.collection_id,
      jsonb_build_object(
        'collection_id', NEW.collection_id,
        'collection_name', collection_name,
        'feature_type', NEW.feature_type,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new featured collections
CREATE TRIGGER on_collection_featured
  AFTER INSERT ON public.featured_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_featured_collection();