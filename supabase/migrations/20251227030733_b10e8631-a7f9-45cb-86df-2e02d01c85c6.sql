-- Create storage bucket for collection images
INSERT INTO storage.buckets (id, name, public)
VALUES ('collection-images', 'collection-images', true);

-- Allow authenticated users to upload their own collection images
CREATE POLICY "Users can upload collection images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'collection-images' 
  AND auth.uid() IS NOT NULL
);

-- Allow public read access to collection images
CREATE POLICY "Public can view collection images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'collection-images');

-- Allow users to update their own uploaded images
CREATE POLICY "Users can update their own collection images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'collection-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own uploaded images
CREATE POLICY "Users can delete their own collection images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'collection-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);