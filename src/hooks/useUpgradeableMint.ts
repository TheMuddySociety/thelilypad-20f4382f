import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { UPGRADEABLE_LILYPAD_ABI, constructTokenURI } from "@/config/nftFactory";
import { encodeFunctionData } from "viem";
import { supabase } from "@/integrations/supabase/client";
import { getMonadChain, NetworkType } from "@/config/alchemy";
import { toast } from "sonner";

interface MintState {
  isMinting: boolean;
  txHash: string | null;
  error: string | null;
  mintedTokenId: number | null;
}

// RPC Proxy base URL
const RPC_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rpc-proxy`;

// Make RPC call through the proxy
const rpcProxyCall = async (
  network: NetworkType,
  method: string,
  params: any[]
): Promise<any> => {
  const { data, error } = await supabase.functions.invoke(`rpc-proxy?network=${network}`, {
    body: { method, params },
  });

  if (error) {
    throw new Error(`RPC Proxy error: ${error.message}`);
  }

  if (data.error) {
    throw new Error(data.error.message || 'RPC error');
  }

  return data.result;
};

// Fetch transaction receipt with polling
const fetchReceiptWithProxy = async (
  txHash: string,
  network: NetworkType,
  maxAttempts = 60
): Promise<any> => {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const result = await rpcProxyCall(network, 'eth_getTransactionReceipt', [txHash]);

      if (result) {
        // Monad Asynchronous Execution Tip
        await new Promise(resolve => setTimeout(resolve, 400));
        return result;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      console.error('Receipt fetch error:', error);
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
  }

  return null;
};

export function useUpgradeableMint(contractAddress: string | null) {
  const {
    address,
    isConnected,
    network,
    switchToMonad,
    chainId,
    chainType,
    getProvider,
    isNewAccount,
    lastFundedAt
  } = useWallet();
  const [state, setState] = useState<MintState>({
    isMinting: false,
    txHash: null,
    error: null,
    mintedTokenId: null,
  });

  const resetState = useCallback(() => {
    setState({
      isMinting: false,
      txHash: null,
      error: null,
      mintedTokenId: null,
    });
  }, []);

  // Ensure wallet is on the correct Monad network
  const ensureCorrectNetwork = useCallback(async (): Promise<boolean> => {
    const provider = getProvider();
    if (!provider || chainType !== "evm") return false;

    const targetChain = getMonadChain(network);
    const currentChainId = chainId;

    if (currentChainId !== targetChain.id) {
      try {
        await switchToMonad();
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      } catch (error) {
        console.error("Failed to switch network:", error);
        return false;
      }
    }
    return true;
  }, [network, chainId, switchToMonad, getProvider, chainType]);

  // Mint a single NFT with IPFS URI
  const mint = useCallback(async (
    recipientAddress: string,
    ipfsBaseCID: string,
    tokenId: number,
    collectionId?: string,
    collectionName?: string
  ): Promise<string | null> => {
    const provider = getProvider();
    if (!isConnected || !address || !contractAddress || !provider) {
      setState(prev => ({ ...prev, error: "Wallet or contract not connected" }));
      return null;
    }

    if (chainType !== "evm") {
      const errorMsg = "Please switch to an EVM wallet to mint NFTs.";
      setState(prev => ({ ...prev, error: errorMsg }));
      toast.error("EVM Wallet Required", { description: errorMsg });
      return null;
    }

    // Ensure correct network
    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      setState(prev => ({ ...prev, error: "Please switch to Monad network" }));
      return null;
    }
    setState({
      isMinting: true,
      txHash: null,
      error: null,
      mintedTokenId: null,
    });

    // Check for Monad "New Account Funding Delay"
    if (isNewAccount && lastFundedAt) {
      const timeSinceFunding = Date.now() - lastFundedAt;
      if (timeSinceFunding < 1000) {
        const waitTime = Math.ceil((1000 - timeSinceFunding) / 100) / 10;
        toast.info("Monad Synchronization", {
          description: `New wallet detected. Waiting ${waitTime}s for execution sync...`
        });
        await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceFunding));
      }
    }

    try {
      // Construct the token URI from IPFS CID and token ID
      const tokenURI = constructTokenURI(ipfsBaseCID, tokenId);
      console.log(`Minting token ${tokenId} with URI: ${tokenURI}`);

      // Encode safeMint(address to, string uri)
      const data = encodeFunctionData({
        abi: UPGRADEABLE_LILYPAD_ABI,
        functionName: "safeMint",
        args: [recipientAddress as `0x${string}`, tokenURI],
      });

      // Estimate gas (safeMint with URI storage uses more gas)
      const gasLimit = 250000;

      // Send transaction
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: contractAddress,
          data,
          gas: `0x${gasLimit.toString(16)}`,
        }],
      });

      console.log(`Transaction submitted: ${txHash}`);

      // Wait for receipt
      const receipt = await fetchReceiptWithProxy(txHash, network);

      if (receipt && receipt.status === "0x0") {
        throw new Error("Mint transaction failed on-chain");
      }

      // Record to database if collection ID provided
      if (collectionId) {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Record transaction
          await supabase.from("nft_transactions").insert({
            user_id: user.id,
            collection_id: collectionId,
            tx_hash: txHash,
            tx_type: "mint",
            quantity: 1,
            price_paid: 0,
            status: "confirmed",
            token_ids: [tokenId],
            confirmed_at: new Date().toISOString(),
          });

          // Record minted NFT
          await supabase.from("minted_nfts").insert({
            collection_id: collectionId,
            owner_id: user.id,
            owner_address: recipientAddress,
            token_id: tokenId,
            name: collectionName ? `${collectionName} #${tokenId}` : `Token #${tokenId}`,
            image_url: null, // Will be fetched from IPFS metadata
            tx_hash: txHash,
            attributes: [],
          });

          // Update minted count
          await supabase
            .from("collections")
            .update({ minted: tokenId + 1 })
            .eq("id", collectionId);
        }
      }

      setState({
        isMinting: false,
        txHash,
        error: null,
        mintedTokenId: tokenId,
      });

      toast.success("NFT Minted!", {
        description: `Token #${tokenId} has been minted successfully.`,
      });

      return txHash;

    } catch (error: any) {
      console.error("Mint error:", error);

      let errorMessage = "Minting failed";
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message?.includes("Ownable")) {
        errorMessage = "Only the contract owner can mint";
      } else if (error.message?.includes("paused")) {
        errorMessage = "Contract is paused";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setState({
        isMinting: false,
        txHash: null,
        error: errorMessage,
        mintedTokenId: null,
      });

      return null;
    }
  }, [address, isConnected, contractAddress, chainType, ensureCorrectNetwork, getProvider, network]);

  // Batch mint multiple NFTs
  const batchMint = useCallback(async (
    recipientAddress: string,
    ipfsBaseCID: string,
    startTokenId: number,
    quantity: number,
    collectionId?: string,
    collectionName?: string
  ): Promise<string[]> => {
    const txHashes: string[] = [];

    for (let i = 0; i < quantity; i++) {
      const tokenId = startTokenId + i;
      const txHash = await mint(recipientAddress, ipfsBaseCID, tokenId, collectionId, collectionName);

      if (txHash) {
        txHashes.push(txHash);
      } else {
        // Stop on first failure
        break;
      }
    }

    return txHashes;
  }, [mint]);

  return {
    ...state,
    mint,
    batchMint,
    resetState,
  };
}
