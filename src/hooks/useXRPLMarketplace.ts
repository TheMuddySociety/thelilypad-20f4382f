import { useState, useCallback } from 'react';
import { Client, NFTokenCreateOffer, NFTokenAcceptOffer, xrpToDrops } from 'xrpl';
import { useWallet } from '@/providers/WalletProvider';
import { getXRPLEndpoint } from '@/chains/xrpl/client';
import { getXRPLNetwork } from '@/lib/xrpl-wallet';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface XRPLMarketplaceResult {
    success: boolean;
    hash?: string;
    offerIndex?: string;
    error?: string;
}

export const useXRPLMarketplace = () => {
    const { address, isConnected, signXRPLTransaction } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * List an NFT for sale by creating an on-chain Sell Offer.
     */
    const listNFT = useCallback(async (
        nftId: string,           // Supabase ID
        nfTokenId: string,       // 64-char hex XRPL NFTokenID
        priceXRP: number,
        expiresAt?: Date
    ): Promise<XRPLMarketplaceResult> => {
        if (!isConnected || !address) {
            toast.error("Please connect your XRPL wallet");
            return { success: false, error: "Wallet not connected" };
        }

        setIsLoading(true);
        setError(null);
        let client: Client | null = null;

        try {
            const xrplNetwork = getXRPLNetwork();
            const endpoint = getXRPLEndpoint(xrplNetwork);
            client = new Client(endpoint);
            await client.connect();

            toast.loading("Creating Sell Offer on XRPL...", { id: 'xrpl-list' });

            const listTx: NFTokenCreateOffer = {
                TransactionType: "NFTokenCreateOffer",
                Account: address,
                NFTokenID: nfTokenId,
                Amount: xrpToDrops(priceXRP),
                Flags: 1, // tfSellNFToken
                ...(expiresAt ? { Expiration: (expiresAt.getTime() - 946684800000) / 1000 } : {}), // Ripple Epoch
            };

            const prepared = await client.autofill(listTx);
            const signed = await signXRPLTransaction(prepared);

            const result = await client.submitAndWait(signed.tx_blob);

            const txResult = (result.result.meta as any)?.TransactionResult;
            if (txResult !== 'tesSUCCESS') {
                throw new Error(`Listing failed on ledger: ${txResult || 'unknown result'}`);
            }

            // Extract the offer index from metadata
            const affectedNodes = (result.result.meta as any)?.AffectedNodes || [];
            let offerIndex = "";
            for (const node of affectedNodes) {
                if (node.CreatedNode?.LedgerEntryType === "NFTokenOffer") {
                    offerIndex = node.CreatedNode.LedgerIndex;
                    break;
                }
            }

            if (!offerIndex) {
                console.warn("Offer created but index not found in metadata");
            }

            // Update/Link listing in Supabase
            // Note: caller should handle the actual nft_listings table insertion
            // but we provide the on-chain evidence here.

            toast.success("XRPL Listing Created!", { id: 'xrpl-list' });

            return {
                success: true,
                hash: result.result.hash,
                offerIndex
            };

        } catch (err: any) {
            console.error("XRPL Listing error:", err);
            const msg = err.message || "XRPL Listing failed";
            setError(msg);
            toast.error(msg, { id: 'xrpl-list' });
            return { success: false, error: msg };
        } finally {
            try { if (client?.isConnected()) await client.disconnect(); } catch { /* ignore */ }
            setIsLoading(false);
        }
    }, [address, isConnected, signXRPLTransaction]);

    /**
     * Purchase an NFT by accepting a Sell Offer.
     */
    const buyNFT = useCallback(async (
        listingId: string,
        offerIndex: string,
        priceXRP: number
    ): Promise<XRPLMarketplaceResult> => {
        if (!isConnected || !address) {
            toast.error("Please connect your XRPL wallet");
            return { success: false, error: "Wallet not connected" };
        }

        setIsLoading(true);
        setError(null);
        let client: Client | null = null;

        try {
            const xrplNetwork = getXRPLNetwork();
            const endpoint = getXRPLEndpoint(xrplNetwork);
            client = new Client(endpoint);
            await client.connect();

            toast.loading("Accepting XRPL Offer...", { id: 'xrpl-buy' });

            const acceptTx: NFTokenAcceptOffer = {
                TransactionType: "NFTokenAcceptOffer",
                Account: address,
                NFTokenSellOffer: offerIndex,
            };

            const prepared = await client.autofill(acceptTx);
            const signed = await signXRPLTransaction(prepared);

            const result = await client.submitAndWait(signed.tx_blob);

            const txResult = (result.result.meta as any)?.TransactionResult;
            if (txResult !== 'tesSUCCESS') {
                throw new Error(`Purchase failed on ledger: ${txResult || 'unknown result'}`);
            }

            // Update listing in Supabase
            const { error: updateError } = await supabase
                .from('nft_listings')
                .update({ 
                    status: 'sold', 
                    sold_at: new Date().toISOString(), 
                    buyer_id: (await supabase.auth.getUser()).data.user?.id,
                    tx_hash: result.result.hash 
                })
                .eq('id', listingId);

            if (updateError) console.warn("[XRPL Marketplace] Error updating listing:", updateError);

            toast.success("XRPL Purchase Success!", { id: 'xrpl-buy' });

            return {
                success: true,
                hash: result.result.hash,
            };

        } catch (err: any) {
            console.error("XRPL Purchase error:", err);
            const msg = err.message || "XRPL Purchase failed";
            setError(msg);
            toast.error(msg, { id: 'xrpl-buy' });
            return { success: false, error: msg };
        } finally {
            try { if (client?.isConnected()) await client.disconnect(); } catch { /* ignore */ }
            setIsLoading(false);
        }
    }, [address, isConnected, signXRPLTransaction]);

    return {
        isLoading,
        error,
        listNFT,
        buyNFT
    };
};
