-- Migration: Add NFT Pool and Escrow Wallet support to Blind Boxes
-- Phase 3: Reward Pool System for on-chain reward distribution

-- Add columns for on-chain integration
ALTER TABLE lily_blind_boxes 
ADD COLUMN IF NOT EXISTS nft_pool_address TEXT, -- Candy Machine address for NFT rewards
ADD COLUMN IF NOT EXISTS token_mint TEXT,       -- SPL token mint for token rewards  
ADD COLUMN IF NOT EXISTS escrow_wallet TEXT,    -- Wallet holding reward funds
ADD COLUMN IF NOT EXISTS pool_type TEXT DEFAULT 'off_chain', -- 'off_chain', 'candy_machine', 'escrow'
ADD COLUMN IF NOT EXISTS nft_collection_id UUID REFERENCES collections(id); -- Link to internal collection

-- Add NFT address tracking to purchases
ALTER TABLE lily_blind_box_purchases
ADD COLUMN IF NOT EXISTS nft_address TEXT; -- On-chain address of minted NFT reward

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_blind_boxes_pool_type ON lily_blind_boxes(pool_type);
CREATE INDEX IF NOT EXISTS idx_blind_boxes_nft_pool ON lily_blind_boxes(nft_pool_address) WHERE nft_pool_address IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN lily_blind_boxes.nft_pool_address IS 'Candy Machine address for NFT rewards';
COMMENT ON COLUMN lily_blind_boxes.token_mint IS 'SPL token mint address for token rewards';
COMMENT ON COLUMN lily_blind_boxes.escrow_wallet IS 'Wallet holding SOL/token funds for rewards';
COMMENT ON COLUMN lily_blind_boxes.pool_type IS 'off_chain (simulated), candy_machine (NFT), or escrow (tokens)';
