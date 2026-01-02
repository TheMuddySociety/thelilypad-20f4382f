-- Add ipfs_base_cid column to collections table for storing IPFS metadata CID
ALTER TABLE public.collections 
ADD COLUMN ipfs_base_cid TEXT;

COMMENT ON COLUMN public.collections.ipfs_base_cid IS 'Base IPFS CID for collection metadata (e.g., bafybeierqu2ycthbpbok7dofkxubhuwvddjyzuaheuxzttu4vcbsaqed7m)';