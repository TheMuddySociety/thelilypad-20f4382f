-- Create storage bucket for stream thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('stream-thumbnails', 'stream-thumbnails', true);

-- Allow authenticated users to upload their own thumbnails
CREATE POLICY "Users can upload their own stream thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'stream-thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update/delete their own thumbnails
CREATE POLICY "Users can update their own stream thumbnails"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'stream-thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own stream thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'stream-thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Anyone can view stream thumbnails (public bucket)
CREATE POLICY "Anyone can view stream thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'stream-thumbnails');