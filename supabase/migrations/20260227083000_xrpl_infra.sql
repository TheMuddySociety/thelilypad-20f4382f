-- XRPL Infrastructure Enhancements
-- Adds the xrpl_taxon column to the collections table for XLS-20 identification
-- and ensures minted_nfts has correct indices.
-- 1. Add xrpl_taxon to collections
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'collections'
        AND column_name = 'xrpl_taxon'
) THEN
ALTER TABLE public.collections
ADD COLUMN xrpl_taxon INTEGER;
END IF;
END $$;
-- 2. Ensure indices for performance
CREATE INDEX IF NOT EXISTS idx_collections_xrpl_taxon ON public.collections(xrpl_taxon);
CREATE INDEX IF NOT EXISTS idx_minted_nfts_collection_owner ON public.minted_nfts(collection_id, owner_address);
-- 3. Extend RLS for minted_nfts to allow public viewing
DROP POLICY IF EXISTS "Anyone can view minted NFTs" ON public.minted_nfts;
CREATE POLICY "Anyone can view minted NFTs" ON public.minted_nfts FOR
SELECT USING (true);
-- 4. Allow authenticated users to insert mints (for non-custodial tracking)
DROP POLICY IF EXISTS "Authenticated users can track mints" ON public.minted_nfts;
CREATE POLICY "Authenticated users can track mints" ON public.minted_nfts FOR
INSERT WITH CHECK (auth.role() = 'authenticated');