import { useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { supabase } from "@/integrations/supabase/client";
import { parseEther, encodeFunctionData, createPublicClient, http } from "viem";
import { NetworkType } from "@/config/alchemy";
import { toast } from "sonner";
import MARKETPLACE_ABI from "../../contracts/abis/LilyPadMarketplace.json";
import NFT_ABI from "../../contracts/abis/LilyPadNFTCollection.json";

// The Marketplace contract address on Monad Testnet
const MARKETPLACE_ADDRESS = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7";

/**
 * Hook for interacting with the LilyPad Marketplace contract.
 * Standardized for Monad Best Practices (Indexing Delays & RPC Proxy).
 */
export function useMarketplaceContract() {
    const { address, isConnected, network, getProvider, currentChain, switchToMonad, chainId } = useWallet();

    // Helper to ensure correct network
    const ensureCorrectNetwork = useCallback(async (): Promise<boolean> => {
        const provider = getProvider();
        if (!provider) return false;
        const testnetId = 10143n; // Monad Testnet
        if (BigInt(chainId || 0) !== testnetId) {
            try {
                await switchToMonad();
                return true;
            } catch { return false; }
        }
        return true;
    }, [chainId, switchToMonad, getProvider]);

    // Standardized Receipt Fetching with Monad Delay
    const fetchReceipt = async (txHash: string): Promise<any> => {
        const networkType = network as NetworkType;
        let attempts = 0;
        while (attempts < 60) {
            try {
                const { data } = await supabase.functions.invoke(`rpc-proxy?network=${networkType}`, {
                    body: { method: 'eth_getTransactionReceipt', params: [txHash] },
                });
                if (data?.result) {
                    // Monad Asynchronous Execution Tip: Wait for indexing
                    await new Promise(resolve => setTimeout(resolve, 400));
                    return data.result;
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
                attempts++;
            } catch {
                await new Promise(resolve => setTimeout(resolve, 2000));
                attempts++;
            }
        }
        return null;
    };

    const executeMarketplaceTx = async (to: string, abi: any, functionName: string, args: any[], value?: bigint) => {
        const provider = getProvider();
        if (!isConnected || !address || !provider) throw new Error("Wallet not connected");

        if (!(await ensureCorrectNetwork())) throw new Error("Please switch to Monad network");

        const data = encodeFunctionData({ abi, functionName, args });

        // Use a generous gas limit for marketplace operations
        const gasLimit = 500000n;

        try {
            const txParams: any = {
                from: address,
                to,
                data,
                gas: `0x${gasLimit.toString(16)}`,
            };
            if (value) txParams.value = `0x${value.toString(16)}`;

            const hash = await provider.request({
                method: "eth_sendTransaction",
                params: [txParams],
            });

            toast.info("Transaction submitted", { description: "Waiting for Monad indexing..." });
            await fetchReceipt(hash);
            return hash;
        } catch (error: any) {
            console.error(`Marketplace error (${functionName}):`, error);
            throw error;
        }
    };

    const checkApproval = useCallback(async (nftAddress: string) => {
        if (!address) return false;
        const client = createPublicClient({ chain: currentChain, transport: http() });
        try {
            const isApproved = await client.readContract({
                address: nftAddress as `0x${string}`,
                abi: NFT_ABI,
                functionName: 'isApprovedForAll',
                args: [address as `0x${string}`, MARKETPLACE_ADDRESS as `0x${string}`]
            });
            return isApproved;
        } catch (error) {
            console.error("Error checking approval:", error);
            return false;
        }
    }, [address, currentChain]);

    const setApprovalForAll = useCallback(async (nftAddress: string, approved: boolean = true) => {
        return executeMarketplaceTx(nftAddress, NFT_ABI, "setApprovalForAll", [MARKETPLACE_ADDRESS, approved])
            .then(hash => { toast.success("Approval updated"); return hash; });
    }, [address, getProvider, ensureCorrectNetwork]);

    const listItem = useCallback(async (nftAddress: string, tokenId: number, price: number) => {
        const priceInWei = parseEther(price.toString());
        return executeMarketplaceTx(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, "listItem", [nftAddress, BigInt(tokenId), priceInWei])
            .then(hash => { toast.success("Item listed successfully"); return hash; });
    }, [address, getProvider, ensureCorrectNetwork]);

    const buyItem = useCallback(async (listingId: number, price: number) => {
        const priceInWei = parseEther(price.toString());
        return executeMarketplaceTx(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, "buyItem", [BigInt(listingId)], priceInWei)
            .then(hash => { toast.success("Item purchased successfully!"); return hash; });
    }, [address, getProvider, ensureCorrectNetwork]);

    const cancelListing = useCallback(async (listingId: number) => {
        return executeMarketplaceTx(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, "cancelListing", [BigInt(listingId)])
            .then(hash => { toast.success("Listing cancelled"); return hash; });
    }, [address, getProvider, ensureCorrectNetwork]);

    return {
        listItem,
        buyItem,
        cancelListing,
        checkApproval,
        setApprovalForAll,
        MARKETPLACE_ADDRESS,
    };
}
