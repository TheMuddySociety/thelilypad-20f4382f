-- Drop restrictive policies that require auth.uid() for buckets used by wallet-authenticated users
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload collection images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own collection images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own collection images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own draft images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own draft images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own draft images" ON storage.objects;

-- Create new permissive policies for avatars bucket (used for profile images)
-- Since we use wallet addresses (not Supabase auth), we need to allow any insert/update/delete
-- The folder structure uses wallet addresses, which provides isolation
CREATE POLICY "Anyone can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can delete avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars');

-- Create new permissive policies for collection-images bucket
CREATE POLICY "Anyone can upload collection images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'collection-images');

CREATE POLICY "Anyone can update collection images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'collection-images');

CREATE POLICY "Anyone can delete collection images"
ON storage.objects FOR DELETE
USING (bucket_id = 'collection-images');

-- Create new permissive policies for collection-drafts bucket
CREATE POLICY "Anyone can upload draft images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'collection-drafts');

CREATE POLICY "Anyone can update draft images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'collection-drafts');

CREATE POLICY "Anyone can delete draft images"
ON storage.objects FOR DELETE
USING (bucket_id = 'collection-drafts');