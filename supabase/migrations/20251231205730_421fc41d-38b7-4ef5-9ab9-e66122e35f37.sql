-- Update governance_config to be NFT-based
ALTER TABLE governance_config 
ADD COLUMN IF NOT EXISTS governance_collection_id UUID REFERENCES collections(id),
ADD COLUMN IF NOT EXISTS governance_type TEXT DEFAULT 'nft',
ADD COLUMN IF NOT EXISTS nft_voting_tiers JSONB DEFAULT '[{"tier": "common", "votes": 1}, {"tier": "rare", "votes": 3}, {"tier": "legendary", "votes": 10}]'::jsonb;

-- Drop token_address column since we're using NFTs now
ALTER TABLE governance_config 
ALTER COLUMN token_address DROP NOT NULL;

-- Update governance_token_holders to be governance_nft_holders
-- First, let's rename it to be more accurate
ALTER TABLE governance_token_holders 
ADD COLUMN IF NOT EXISTS nft_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS nft_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rarity_breakdown JSONB DEFAULT '{"common": 0, "rare": 0, "legendary": 0}'::jsonb;

-- Add comment to clarify this table now tracks NFT-based voting power
COMMENT ON TABLE governance_token_holders IS 'Tracks NFT-based governance voting power for DAO participants';