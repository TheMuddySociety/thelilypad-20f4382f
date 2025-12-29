-- Add payout wallet address column to streamer_profiles
ALTER TABLE public.streamer_profiles
ADD COLUMN payout_wallet_address text;

-- Add a comment explaining the column
COMMENT ON COLUMN public.streamer_profiles.payout_wallet_address IS 'Optional wallet address for receiving payouts. If not set, connected wallet is used.';