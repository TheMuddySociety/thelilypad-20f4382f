-- Fix: Replace fully permissive storage policies with authenticated-only policies.
-- Wallet users get a Supabase session via signInAnonymously(), so auth.uid() IS NOT NULL.

-- Drop the permissive policies from migration 20260121014247
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete avatars" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can upload collection images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update collection images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete collection images" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can upload draft images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update draft images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete draft images" ON storage.objects;

-- Avatars: authenticated users only
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars');

-- Collection images: authenticated users only
CREATE POLICY "Authenticated users can upload collection images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'collection-images');

CREATE POLICY "Authenticated users can update collection images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'collection-images');

CREATE POLICY "Authenticated users can delete collection images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'collection-images');

-- Collection drafts: authenticated users only
CREATE POLICY "Authenticated users can upload draft images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'collection-drafts');

CREATE POLICY "Authenticated users can update draft images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'collection-drafts');

CREATE POLICY "Authenticated users can delete draft images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'collection-drafts');