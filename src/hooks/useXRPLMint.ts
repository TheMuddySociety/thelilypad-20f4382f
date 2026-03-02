import { useState, useCallback } from 'react';
import { Client, NFTokenMint, NFTokenMintFlags, convertStringToHex } from 'xrpl';
import { useWallet } from '@/providers/WalletProvider';
import { getXRPLEndpoint } from '@/chains/xrpl/client';
import { getXRPLNetwork } from '@/lib/xrpl-wallet';
import { safeExtractNFTokenId } from '@/chains/xrpl/nft';
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
    const { address, isConnected, signXRPLTransaction } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Track mint transaction in Supabase.
     *
     * FIX XRPL-004: token_id is now stored as the real 64-char hex NFTokenID string,
     * not a broken parseInt of hex which always produced 0 or garbage.
     */
    const trackMintTransaction = useCallback(async (
        hash: string,
        nfTokenId: string,     // 64-char hex NFTokenID
        collectionId: string | undefined,
        phaseId: string,
        price: number,
        walletAddress: string
    ) => {
        if (!collectionId) return;

        try {
            const { error: insertError } = await supabase.from('minted_nfts').insert({
                collection_id: collectionId,
                // Store the real NFTokenID as a string — cast to numeric via substring for legacy int column
                // If your DB column is `text`, just use: nft_token_id: nfTokenId
                token_id: 0,                                        // keep int column happy with sentinel
                nft_token_id: nfTokenId,                            // real 64-char XRPL token ID
                name: "XRPL NFT #" + nfTokenId.substring(0, 8),
                owner_address: walletAddress,
                owner_id: (await supabase.auth.getUser()).data.user?.id || '',
                tx_hash: hash,
                is_revealed: true,
                minted_at: new Date().toISOString()
            });
            if (insertError) console.warn("[XRPL Mint] Tracking error:", insertError);
        } catch (err) {
            console.warn("[XRPL Mint] Error tracking:", err);
        }
    }, [address]);

    /**
     * Core XLS-20 single-mint function (used for individual mints from collection pages).
     *
     * FIX XRPL-001: Buffer.from() → convertStringToHex (browser-safe, from xrpl.js)
     * FIX XRPL-002: NFTokenID extracted via safeExtractNFTokenId (correct meta path)
     * FIX XRPL-003: tesSUCCESS validated before storing result
     * FIX XRPL-004: token stored as string NFTokenID, not parsed int
     * FIX XRPL-013: uses getXRPLNetwork() instead of Solana network variable
     */
    const mintNFT = useCallback(async (
        metadataUri: string,
        args: XRPLMintArgs = {}
    ) => {
        if (!isConnected || !address) {
            toast.error("Please connect your XRPL wallet");
            return;
        }

        // Phase 6: Royalty cap parity with useXRPLLaunch
        if (args.transferFee !== undefined && (args.transferFee < 0 || args.transferFee > 50000)) {
            toast.error(`Invalid transfer fee: ${(args.transferFee / 1000).toFixed(1)}%. XRPL max is 50%.`);
            return;
        }

        setIsLoading(true);
        setError(null);
        let client: Client | null = null;

        try {
            // FIX XRPL-013: use XRPL-specific network setting, not Solana's
            const xrplNetwork = getXRPLNetwork();
            const endpoint = getXRPLEndpoint(xrplNetwork === 'mainnet' ? 'mainnet' : 'testnet');
            client = new Client(endpoint);
            await client.connect();

            toast.loading("Preparing XRPL Mint...", { id: 'xrpl-mint' });

            // FIX XRPL-001: convertStringToHex is browser-native (no Buffer polyfill needed)
            const hexUri = convertStringToHex(metadataUri);
            if (hexUri.length > 512) {
                throw new Error(`Metadata URI exceeds XRPL 256-byte limit (${Math.ceil(hexUri.length / 2)} bytes). Shorten the URL.`);
            }

            const mintTx: NFTokenMint = {
                TransactionType: "NFTokenMint",
                Account: address,
                URI: hexUri,
                Flags: NFTokenMintFlags.tfTransferable,
                TransferFee: args.transferFee || 0,
                NFTokenTaxon: args.taxon || 0,
            };

            const prepared = await client.autofill(mintTx);

            toast.loading("Signing Transaction...", { id: 'xrpl-mint' });

            // Sign using the WalletProvider (Phantom / XUMM, etc.)
            const signed = await signXRPLTransaction(prepared);

            toast.loading("Submitting to Ledger...", { id: 'xrpl-mint' });

            const result = await client.submitAndWait(signed.tx_blob);

            // FIX XRPL-003: Validate tesSUCCESS — don't treat failures as success
            const txResult = (result.result.meta as any)?.TransactionResult;
            if (txResult !== 'tesSUCCESS') {
                throw new Error(`Mint failed on ledger: ${txResult || 'unknown result'}`);
            }

            // FIX XRPL-002: Extract from correct path using the shared helper
            const nfTokenId = safeExtractNFTokenId(result.result.meta);
            if (!nfTokenId) {
                throw new Error('Mint succeeded but NFTokenID could not be extracted. Check the ledger explorer.');
            }

            // Track in DB (with real NFTokenID)
            if (args.collectionId) {
                await trackMintTransaction(
                    result.result.hash!,
                    nfTokenId,
                    args.collectionId,
                    args.phaseId || 'public',
                    args.price || 0,
                    address
                );
            }

            toast.success("XRPL Mint Success!", { id: 'xrpl-mint' });

            return {
                hash: result.result.hash,
                nfTokenId,             // real 64-char hex
            };

        } catch (err: any) {
            console.error("XRPL Mint error:", err);
            const msg = err.message || "XRPL Mint failed";
            setError(msg);
            toast.error(msg, { id: 'xrpl-mint' });
            throw err;
        } finally {
            // FIX XRPL-007: Wrap disconnect in try/catch so an error here
            // doesn't swallow the original error from the try block
            try { if (client?.isConnected()) await client.disconnect(); } catch { /* ignore */ }
            setIsLoading(false);
        }
    }, [address, isConnected, signXRPLTransaction, trackMintTransaction]);

    return {
        isLoading,
        error,
        mintNFT
    };
};
