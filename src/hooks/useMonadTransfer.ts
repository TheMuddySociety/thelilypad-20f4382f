import { useState, useCallback } from 'react';
import {
    createPublicClient,
    createWalletClient,
    custom,
    http
} from 'viem';
import { monadTestnet } from 'viem/chains';
import { useWallet } from '@/providers/WalletProvider';
import { MONAD_NETWORKS, DEFAULT_MONAD_NETWORK } from '@/config/monad';
import { MONAD_ERC721_ABI } from '@/chains/monad/abi/ERC721';
import { toast } from 'sonner';

export const useMonadTransfer = () => {
    const { address } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const transferAsset = useCallback(async (
        contractAddress: string,
        newOwnerAddress: string,
        tokenId: number | string
    ) => {
        if (!window.ethereum || !address) {
            throw new Error("Wallet not connected");
        }

        setIsLoading(true);
        setError(null);
        try {
            toast.loading(`Processing Monad transfer...`, { id: 'monad-transfer' });

            const publicClient = createPublicClient({
                chain: monadTestnet,
                transport: http(MONAD_NETWORKS[DEFAULT_MONAD_NETWORK].url)
            });

            const walletClient = createWalletClient({
                chain: monadTestnet,
                transport: custom(window.ethereum)
            });

            // ERC-721 safeTransferFrom(address from, address to, uint256 tokenId)
            // ABI for safeTransferFrom (one of the overloads)
            const transferAbi = [
                {
                    inputs: [
                        { internalType: "address", name: "from", type: "address" },
                        { internalType: "address", name: "to", type: "address" },
                        { internalType: "uint256", name: "tokenId", type: "uint256" }
                    ],
                    name: "safeTransferFrom",
                    outputs: [],
                    stateMutability: "nonpayable",
                    type: "function"
                }
            ];

            const { request } = await publicClient.simulateContract({
                account: address as `0x${string}`,
                address: contractAddress as `0x${string}`,
                abi: transferAbi,
                functionName: 'safeTransferFrom',
                args: [address, newOwnerAddress, BigInt(tokenId)]
            });

            const hash = await walletClient.writeContract(request);

            toast.success(`Transfer successful!`, { id: 'monad-transfer' });
            return {
                hash,
                success: true
            };
        } catch (err: any) {
            console.error("Monad transfer error:", err);
            const msg = err.message || "Failed to transfer Monad NFT";
            setError(msg);
            toast.error(msg, { id: 'monad-transfer' });
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [address]);

    return {
        isLoading,
        error,
        transferAsset,
    };
};
