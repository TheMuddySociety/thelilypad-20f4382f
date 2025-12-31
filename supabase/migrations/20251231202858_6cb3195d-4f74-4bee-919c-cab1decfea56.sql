-- ============================================
-- DAO Governance Database Schema
-- ============================================

-- Table: governance_proposals
-- Stores all DAO proposals with on-chain and off-chain metadata
CREATE TABLE public.governance_proposals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id TEXT NOT NULL UNIQUE,
    proposer_address TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    targets JSONB NOT NULL DEFAULT '[]'::jsonb,
    values JSONB NOT NULL DEFAULT '[]'::jsonb,
    calldatas JSONB NOT NULL DEFAULT '[]'::jsonb,
    start_block BIGINT NOT NULL,
    end_block BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    for_votes NUMERIC NOT NULL DEFAULT 0,
    against_votes NUMERIC NOT NULL DEFAULT 0,
    abstain_votes NUMERIC NOT NULL DEFAULT 0,
    quorum_votes NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    executed_at TIMESTAMP WITH TIME ZONE,
    queued_at TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    tx_hash TEXT,
    execution_tx_hash TEXT,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'canceled', 'defeated', 'succeeded', 'queued', 'executed', 'expired'))
);

-- Table: governance_votes
-- Records all votes cast on proposals
CREATE TABLE public.governance_votes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id UUID NOT NULL REFERENCES public.governance_proposals(id) ON DELETE CASCADE,
    voter_address TEXT NOT NULL,
    voter_id UUID,
    support INTEGER NOT NULL,
    weight NUMERIC NOT NULL DEFAULT 0,
    reason TEXT,
    tx_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT valid_support CHECK (support IN (0, 1, 2)),
    CONSTRAINT unique_vote_per_proposal UNIQUE (proposal_id, voter_address)
);

-- Table: governance_delegations
-- Tracks voting power delegations
CREATE TABLE public.governance_delegations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    delegator_address TEXT NOT NULL,
    delegate_address TEXT NOT NULL,
    voting_power NUMERIC NOT NULL DEFAULT 0,
    tx_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: governance_token_holders
-- Tracks LILY token holders and their voting power
CREATE TABLE public.governance_token_holders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT NOT NULL UNIQUE,
    user_id UUID,
    balance NUMERIC NOT NULL DEFAULT 0,
    voting_power NUMERIC NOT NULL DEFAULT 0,
    delegated_to TEXT,
    is_delegate BOOLEAN NOT NULL DEFAULT false,
    delegators_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: governance_config
-- Stores governance contract addresses and configuration
CREATE TABLE public.governance_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    token_address TEXT NOT NULL,
    governor_address TEXT NOT NULL,
    timelock_address TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    voting_delay_blocks INTEGER NOT NULL DEFAULT 7200,
    voting_period_blocks INTEGER NOT NULL DEFAULT 50400,
    proposal_threshold NUMERIC NOT NULL DEFAULT 100000,
    quorum_percentage INTEGER NOT NULL DEFAULT 4,
    timelock_delay_seconds INTEGER NOT NULL DEFAULT 86400,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_governance_proposals_status ON public.governance_proposals(status);
CREATE INDEX idx_governance_proposals_proposer ON public.governance_proposals(proposer_address);
CREATE INDEX idx_governance_proposals_created_at ON public.governance_proposals(created_at DESC);
CREATE INDEX idx_governance_votes_proposal ON public.governance_votes(proposal_id);
CREATE INDEX idx_governance_votes_voter ON public.governance_votes(voter_address);
CREATE INDEX idx_governance_delegations_delegator ON public.governance_delegations(delegator_address);
CREATE INDEX idx_governance_delegations_delegate ON public.governance_delegations(delegate_address);
CREATE INDEX idx_governance_token_holders_voting_power ON public.governance_token_holders(voting_power DESC);

-- Enable RLS on all tables
ALTER TABLE public.governance_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_token_holders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for governance_proposals
CREATE POLICY "Anyone can view governance proposals"
ON public.governance_proposals FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create proposals"
ON public.governance_proposals FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage proposals"
ON public.governance_proposals FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for governance_votes
CREATE POLICY "Anyone can view governance votes"
ON public.governance_votes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can cast votes"
ON public.governance_votes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage votes"
ON public.governance_votes FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for governance_delegations
CREATE POLICY "Anyone can view delegations"
ON public.governance_delegations FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create delegations"
ON public.governance_delegations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage delegations"
ON public.governance_delegations FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for governance_token_holders
CREATE POLICY "Anyone can view token holders"
ON public.governance_token_holders FOR SELECT
USING (true);

CREATE POLICY "Service role can manage token holders"
ON public.governance_token_holders FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for governance_config
CREATE POLICY "Anyone can view governance config"
ON public.governance_config FOR SELECT
USING (true);

CREATE POLICY "Admins can manage governance config"
ON public.governance_config FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.governance_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.governance_votes;

-- Function to update proposal vote counts
CREATE OR REPLACE FUNCTION public.update_proposal_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.governance_proposals
    SET 
        for_votes = COALESCE((
            SELECT SUM(weight) FROM public.governance_votes 
            WHERE proposal_id = NEW.proposal_id AND support = 1
        ), 0),
        against_votes = COALESCE((
            SELECT SUM(weight) FROM public.governance_votes 
            WHERE proposal_id = NEW.proposal_id AND support = 0
        ), 0),
        abstain_votes = COALESCE((
            SELECT SUM(weight) FROM public.governance_votes 
            WHERE proposal_id = NEW.proposal_id AND support = 2
        ), 0)
    WHERE id = NEW.proposal_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to automatically update vote counts
CREATE TRIGGER trigger_update_vote_counts
AFTER INSERT OR UPDATE ON public.governance_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_proposal_vote_counts();

-- Function to update token holder voting power
CREATE OR REPLACE FUNCTION public.update_token_holder_voting_power()
RETURNS TRIGGER AS $$
BEGIN
    -- Update delegator count for the delegate
    IF NEW.delegate_address IS NOT NULL THEN
        UPDATE public.governance_token_holders
        SET 
            is_delegate = true,
            delegators_count = (
                SELECT COUNT(*) FROM public.governance_delegations
                WHERE delegate_address = NEW.delegate_address
            ),
            updated_at = now()
        WHERE wallet_address = NEW.delegate_address;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for delegation updates
CREATE TRIGGER trigger_update_delegation_stats
AFTER INSERT OR UPDATE ON public.governance_delegations
FOR EACH ROW
EXECUTE FUNCTION public.update_token_holder_voting_power();