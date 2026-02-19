-- Migration: Add chain support to buyback tables
-- 1. Add chain column to buyback_pool (default to 'solana' for existing data)
ALTER TABLE buyback_pool
ADD COLUMN IF NOT EXISTS chain text NOT NULL DEFAULT 'solana';
-- Add unique constraint on chain to ensure only one pool per chain
ALTER TABLE buyback_pool
ADD CONSTRAINT buyback_pool_chain_key UNIQUE (chain);
-- 2. Add chain column to volume_tracking
ALTER TABLE volume_tracking
ADD COLUMN IF NOT EXISTS chain text NOT NULL DEFAULT 'solana';
-- 3. Add chain column to buyback_events
ALTER TABLE buyback_events
ADD COLUMN IF NOT EXISTS chain text NOT NULL DEFAULT 'solana';
-- 4. Seed pools for other chains if they don't exist
INSERT INTO buyback_pool (
        chain,
        pool_balance,
        accumulated_volume,
        buyback_threshold,
        total_buybacks_executed
    )
VALUES ('xrpl', 0, 0, 10000, 0),
    -- 10k XRP threshold
    ('monad', 0, 0, 100, 0) -- 100 MON threshold
    ON CONFLICT (chain) DO NOTHING;
-- 5. Add chain column to buyback_program_collections (to filter enrolled collections)
ALTER TABLE buyback_program_collections
ADD COLUMN IF NOT EXISTS chain text NOT NULL DEFAULT 'solana';