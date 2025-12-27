-- Create storage bucket for draft images
INSERT INTO storage.buckets (id, name, public)
VALUES ('collection-drafts', 'collection-drafts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own draft images
CREATE POLICY "Users can upload their own draft images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'collection-drafts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anyone to view draft images (since bucket is public)
CREATE POLICY "Draft images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'collection-drafts');

-- Allow users to update their own draft images
CREATE POLICY "Users can update their own draft images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'collection-drafts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own draft images
CREATE POLICY "Users can delete their own draft images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'collection-drafts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);