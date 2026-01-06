import { useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { supabase } from "@/integrations/supabase/client";
import { parseEther, encodeFunctionData } from "viem";
import MARKETPLACE_ABI from "../../contracts/abis/LilyPadMarketplace.json";
import NFT_ABI from "../../contracts/abis/LilyPadNFTCollection.json";

const MARKETPLACE_ADDRESS = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7"; // Placeholder

export function useMarketplaceContract() {
    const { address } = useWallet();

    const rpcProxyCall = async (method: string, params: any[]) => {
        const { data, error } = await supabase.functions.invoke("rpc-proxy", {
            body: { method, params },
        });
        if (error) throw error;
        return data.result;
    };

    const getGasPrice = async () => {
        return await rpcProxyCall("eth_gasPrice", []);
    };

    const getNonce = async (userAddress: string) => {
        return await rpcProxyCall("eth_getTransactionCount", [userAddress, "latest"]);
    };

    const checkApproval = useCallback(async (nftAddress: string, operator: string) => {
        if (!address) return false;
        // In a real app, we'd check if the operator is approved for the owner's NFTs
        return false; // Force approval for demo safety
    }, [address]);

    const setApprovalForAll = useCallback(async (nftAddress: string, approved: boolean = true) => {
        if (!address || !window.ethereum) throw new Error("Wallet not connected");

        const data = encodeFunctionData({
            abi: NFT_ABI,
            functionName: "setApprovalForAll",
            args: [MARKETPLACE_ADDRESS, approved],
        });

        const gasPrice = await getGasPrice();
        const nonce = await getNonce(address);

        const tx = {
            from: address,
            to: nftAddress,
            data,
            gas: "0x4C4B40",
            gasPrice,
            nonce,
        };

        const hash = await window.ethereum.request({
            method: "eth_sendTransaction",
            params: [tx],
        });

        return hash;
    }, [address]);

    const listItem = useCallback(async (nftAddress: string, tokenId: number, price: number) => {
        if (!address || !window.ethereum) throw new Error("Wallet not connected");

        const priceInWei = parseEther(price.toString());
        const data = encodeFunctionData({
            abi: MARKETPLACE_ABI,
            functionName: "listItem",
            args: [nftAddress, BigInt(tokenId), priceInWei],
        });

        const gasPrice = await getGasPrice();
        const nonce = await getNonce(address);

        const tx = {
            from: address,
            to: MARKETPLACE_ADDRESS,
            data,
            gas: "0x4C4B40",
            gasPrice,
            nonce,
        };

        const hash = await window.ethereum.request({
            method: "eth_sendTransaction",
            params: [tx],
        });

        return hash;
    }, [address]);

    const buyItem = useCallback(async (listingId: number, price: number) => {
        if (!address || !window.ethereum) throw new Error("Wallet not connected");

        const priceInWei = parseEther(price.toString());
        const data = encodeFunctionData({
            abi: MARKETPLACE_ABI,
            functionName: "buyItem",
            args: [BigInt(listingId)],
        });

        const gasPrice = await getGasPrice();
        const nonce = await getNonce(address);

        const tx = {
            from: address,
            to: MARKETPLACE_ADDRESS,
            data,
            value: `0x${priceInWei.toString(16)}`,
            gas: "0x4C4B40",
            gasPrice,
            nonce,
        };

        const hash = await window.ethereum.request({
            method: "eth_sendTransaction",
            params: [tx],
        });

        return hash;
    }, [address]);

    const cancelListing = useCallback(async (listingId: number) => {
        if (!address || !window.ethereum) throw new Error("Wallet not connected");

        const data = encodeFunctionData({
            abi: MARKETPLACE_ABI,
            functionName: "cancelListing",
            args: [BigInt(listingId)],
        });

        const gasPrice = await getGasPrice();
        const nonce = await getNonce(address);

        const tx = {
            from: address,
            to: MARKETPLACE_ADDRESS,
            data,
            gas: "0x4C4B40",
            gasPrice,
            nonce,
        };

        const hash = await window.ethereum.request({
            method: "eth_sendTransaction",
            params: [tx],
        });

        return hash;
    }, [address]);

    return {
        listItem,
        buyItem,
        cancelListing,
        checkApproval,
        setApprovalForAll,
        MARKETPLACE_ADDRESS,
    };
}
