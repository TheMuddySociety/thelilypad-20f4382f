-- ═══════════════════════════════════════════════════════════════════════════════
-- NFT STORAGE SUPABASE — Bucket Setup & RLS Policies
-- Project: jlkupdukwgsadvzxafed (thelilypad-storage)
--
-- Run this in the Supabase SQL Editor for the STORAGE project ONLY.
-- Do NOT run on the main app project.
-- ═══════════════════════════════════════════════════════════════════════════════
-- ─── Create Storage Buckets ───────────────────────────────────────────────────
-- NFT Images bucket (public — images are served directly to browsers/marketplaces)
INSERT INTO storage.buckets (
        id,
        name,
        public,
        file_size_limit,
        allowed_mime_types
    )
VALUES (
        'nft-images',
        'nft-images',
        true,
        -- public: no auth needed to READ
        20971520,
        -- 20 MB per image
        ARRAY ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
    ) ON CONFLICT (id) DO
UPDATE
SET public = true,
    file_size_limit = 20971520,
    allowed_mime_types = ARRAY ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
-- NFT Metadata bucket (public — JSON files served to marketplaces)
INSERT INTO storage.buckets (
        id,
        name,
        public,
        file_size_limit,
        allowed_mime_types
    )
VALUES (
        'nft-metadata',
        'nft-metadata',
        true,
        1048576,
        -- 1 MB per JSON file
        ARRAY ['application/json', 'text/plain']
    ) ON CONFLICT (id) DO
UPDATE
SET public = true,
    file_size_limit = 1048576,
    allowed_mime_types = ARRAY ['application/json', 'text/plain'];
-- Collection cover images bucket (public)
INSERT INTO storage.buckets (
        id,
        name,
        public,
        file_size_limit,
        allowed_mime_types
    )
VALUES (
        'collection-images',
        'collection-images',
        true,
        10485760,
        -- 10 MB
        ARRAY ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    ) ON CONFLICT (id) DO
UPDATE
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
-- ─── Row Level Security Policies ─────────────────────────────────────────────
-- This is a STORAGE-ONLY project, so we use the publishable (anon) key.
-- RLS must be enabled on the buckets but policies allow public reads
-- and authenticated (anon-key) writes.
-- ── nft-images ────────────────────────────────────────────────────────────────
-- Anyone can read NFT images (needed for marketplaces + browsers)
CREATE POLICY "nft_images_public_read" ON storage.objects FOR
SELECT USING (bucket_id = 'nft-images');
-- Anyone using the publishable key can upload (creators don't need auth on THIS project)
CREATE POLICY "nft_images_anon_insert" ON storage.objects FOR
INSERT WITH CHECK (bucket_id = 'nft-images');
-- Allow update (upsert) for the same key
CREATE POLICY "nft_images_anon_update" ON storage.objects FOR
UPDATE USING (bucket_id = 'nft-images');
-- Allow delete (for cleanup)
CREATE POLICY "nft_images_anon_delete" ON storage.objects FOR DELETE USING (bucket_id = 'nft-images');
-- ── nft-metadata ──────────────────────────────────────────────────────────────
CREATE POLICY "nft_metadata_public_read" ON storage.objects FOR
SELECT USING (bucket_id = 'nft-metadata');
CREATE POLICY "nft_metadata_anon_insert" ON storage.objects FOR
INSERT WITH CHECK (bucket_id = 'nft-metadata');
CREATE POLICY "nft_metadata_anon_update" ON storage.objects FOR
UPDATE USING (bucket_id = 'nft-metadata');
CREATE POLICY "nft_metadata_anon_delete" ON storage.objects FOR DELETE USING (bucket_id = 'nft-metadata');
-- ── collection-images ────────────────────────────────────────────────────────
CREATE POLICY "collection_images_public_read" ON storage.objects FOR
SELECT USING (bucket_id = 'collection-images');
CREATE POLICY "collection_images_anon_insert" ON storage.objects FOR
INSERT WITH CHECK (bucket_id = 'collection-images');
CREATE POLICY "collection_images_anon_update" ON storage.objects FOR
UPDATE USING (bucket_id = 'collection-images');
CREATE POLICY "collection_images_anon_delete" ON storage.objects FOR DELETE USING (bucket_id = 'collection-images');
-- ─── Verify Setup ─────────────────────────────────────────────────────────────
-- Run this to confirm buckets and policies were created:
-- SELECT id, name, public, file_size_limit FROM storage.buckets;
-- SELECT policyname, tablename, cmd
-- FROM pg_policies
-- WHERE tablename = 'objects'
-- ORDER BY policyname;