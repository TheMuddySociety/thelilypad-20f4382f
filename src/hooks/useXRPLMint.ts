import { useState, useCallback } from 'react';
import { Client, NFTokenMint, NFTokenMintFlags } from 'xrpl';
import { useWallet } from '@/providers/WalletProvider';
import { getXRPLEndpoint } from '@/chains/xrpl/client';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface XRPLMintArgs {
    collectionId?: string;
    phaseId?: string;
    price?: number; // In XRP
    transferFee?: number; // 0-50000 (0% - 50%)
    taxon?: number;
}

export const useXRPLMint = () => {
    const { network, address, isConnected, signXRPLTransaction } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Helper to convert string to Hex (required for XRPL URI field)
     */
    const stringToHex = (str: string) => {
        return Buffer.from(str, 'utf-8').toString('hex').toUpperCase();
    };

    /**
     * Track mint transaction in Supabase
     */
    const trackMintTransaction = useCallback(async (
        hash: string,
        tokenId: string,
        collectionId: string | undefined,
        phaseId: string,
        price: number,
        walletAddress: string
    ) => {
        if (!collectionId) return;

        try {
            // Note: Using any for supabase as the types might not include nft_mints yet
            const { error: insertError } = await (supabase as any).from('nft_mints').insert({
                collection_id: collectionId,
                phase_id: phaseId,
                minter_address: walletAddress,
                mint_address: tokenId,
                transaction_signature: hash,
                price_xrp: price,
            });

            if (insertError) console.warn("[XRPL Mint] Tracking error:", insertError);
        } catch (err) {
            console.warn("[XRPL Mint] Error tracking:", err);
        }
    }, [address]);

    /**
     * Core XLS-20 Mint function
     */
    const mintNFT = useCallback(async (
        metadataUri: string,
        args: XRPLMintArgs = {}
    ) => {
        if (!isConnected || !address) {
            toast.error("Please connect your XRPL wallet");
            return;
        }

        setIsLoading(true);
        setError(null);
        let client: Client | null = null;

        try {
            const endpoint = getXRPLEndpoint(network === 'mainnet' ? 'mainnet' : 'testnet');
            client = new Client(endpoint);
            await client.connect();

            toast.loading("Preparing XRPL Mint...", { id: 'xrpl-mint' });

            // 1. Prepare Mint Transaction
            const mintTx: NFTokenMint = {
                TransactionType: "NFTokenMint",
                Account: address,
                URI: stringToHex(metadataUri),
                Flags: NFTokenMintFlags.tfTransferable,
                TransferFee: args.transferFee || 0,
                NFTokenTaxon: args.taxon || 0,
            };

            const prepared = await client.autofill(mintTx);

            toast.loading("Signing Transaction...", { id: 'xrpl-mint' });

            // 2. Sign using the WalletProvider
            const signed = await signXRPLTransaction(prepared);

            toast.loading("Submitting to Ledger...", { id: 'xrpl-mint' });

            // 3. Submit and wait
            const result = await client.submitAndWait(signed.tx_blob);

            // 4. Parse Token ID from response
            const tokenId = (result.result as any).nftoken_id || "xrpl-nft-" + result.result.hash;

            // 5. Track in DB
            if (args.collectionId) {
                await trackMintTransaction(
                    result.result.hash!,
                    tokenId,
                    args.collectionId,
                    args.phaseId || 'public',
                    args.price || 0,
                    address
                );
            }

            toast.success("XRPL Mint Success!", { id: 'xrpl-mint' });

            return {
                hash: result.result.hash,
                tokenId
            };

        } catch (err: any) {
            console.error("XRPL Mint error:", err);
            const msg = err.message || "XRPL Mint failed";
            setError(msg);
            toast.error(msg, { id: 'xrpl-mint' });
            throw err;
        } finally {
            if (client) await client.disconnect();
            setIsLoading(false);
        }
    }, [address, isConnected, network, signXRPLTransaction, trackMintTransaction]);

    return {
        isLoading,
        error,
        mintNFT
    };
};
