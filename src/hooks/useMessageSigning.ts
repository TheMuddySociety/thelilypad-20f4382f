import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { getPhantomSDK } from "@/config/phantom";
import {
  MintRequest,
  ListingRequest,
  OfferRequest,
  createMintTypedData,
  createListingTypedData,
  createOfferTypedData,
  getDeadline,
  MONAD_MAINNET_CHAIN_ID,
  MONAD_TESTNET_CHAIN_ID,
} from "@/types/eip712";
import { supabase } from "@/integrations/supabase/client";

interface SignResult {
  signature: string;
  request: MintRequest | ListingRequest | OfferRequest;
  deadline: number;
  nonce: number;
}

interface UseMessageSigningReturn {
  signMintRequest: (
    collection: string,
    quantity: number,
    maxPriceWei: string
  ) => Promise<SignResult>;
  signListingRequest: (
    collection: string,
    tokenId: number,
    priceWei: string
  ) => Promise<SignResult>;
  signOfferRequest: (
    collection: string,
    tokenId: number,
    amountWei: string
  ) => Promise<SignResult>;
  signPersonalMessage: (message: string) => Promise<string>;
  isSigning: boolean;
  error: string | null;
}

// Type for the provider
interface EthereumProvider {
  request: (args: { method: string; params: unknown[] }) => Promise<string>;
}

export function useMessageSigning(): UseMessageSigningReturn {
  const { address, network, chainId } = useWallet();
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current nonce for the user
  const fetchNonce = useCallback(async (userAddress: string): Promise<number> => {
    const { data, error } = await supabase
      .from("user_nonces")
      .select("nonce")
      .eq("user_address", userAddress.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error("Error fetching nonce:", error);
      return 0;
    }

    return data?.nonce ?? 0;
  }, []);

  // Get the correct chain ID
  const getChainId = useCallback((): number => {
    if (chainId) return chainId;
    return network === "testnet" ? MONAD_TESTNET_CHAIN_ID : MONAD_MAINNET_CHAIN_ID;
  }, [chainId, network]);

  // Get provider from SDK or window
  const getProvider = useCallback((): EthereumProvider => {
    const sdk = getPhantomSDK();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sdkProvider = (sdk.ethereum as any)?.provider;
    const windowProvider = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
    
    const provider = sdkProvider || windowProvider;
    
    if (!provider) {
      throw new Error("No Ethereum provider found");
    }
    
    return provider;
  }, []);

  // Sign typed data using provider
  const signTypedData = useCallback(
    async (typedData: {
      domain: Record<string, unknown>;
      types: Record<string, Array<{ name: string; type: string }>>;
      primaryType: string;
      message: Record<string, unknown>;
    }): Promise<string> => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      const provider = getProvider();

      // Use eth_signTypedData_v4
      const signature = await provider.request({
        method: "eth_signTypedData_v4",
        params: [
          address,
          JSON.stringify({
            types: {
              EIP712Domain: [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
              ],
              ...typedData.types,
            },
            primaryType: typedData.primaryType,
            domain: typedData.domain,
            message: typedData.message,
          }),
        ],
      });

      return signature;
    },
    [address, getProvider]
  );

  // Sign a mint request
  const signMintRequest = useCallback(
    async (
      collection: string,
      quantity: number,
      maxPriceWei: string
    ): Promise<SignResult> => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      setIsSigning(true);
      setError(null);

      try {
        const nonce = await fetchNonce(address);
        const deadline = getDeadline();
        const chainIdValue = getChainId();

        const request: MintRequest = {
          from: address,
          collection,
          quantity,
          maxPrice: maxPriceWei,
          nonce,
          deadline,
        };

        const typedData = createMintTypedData(request, chainIdValue);

        // Convert BigInts to strings for signing
        const messageForSigning = {
          from: request.from,
          collection: request.collection,
          quantity: request.quantity.toString(),
          maxPrice: request.maxPrice,
          nonce: nonce.toString(),
          deadline: deadline.toString(),
        };

        const signature = await signTypedData({
          domain: typedData.domain,
          types: typedData.types,
          primaryType: typedData.primaryType,
          message: messageForSigning,
        });

        return {
          signature,
          request,
          deadline,
          nonce,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to sign request";
        setError(errorMessage);
        throw err;
      } finally {
        setIsSigning(false);
      }
    },
    [address, fetchNonce, getChainId, signTypedData]
  );

  // Sign a listing request
  const signListingRequest = useCallback(
    async (
      collection: string,
      tokenId: number,
      priceWei: string
    ): Promise<SignResult> => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      setIsSigning(true);
      setError(null);

      try {
        const nonce = await fetchNonce(address);
        const deadline = getDeadline();
        const chainIdValue = getChainId();

        const request: ListingRequest = {
          from: address,
          collection,
          tokenId,
          price: priceWei,
          nonce,
          deadline,
        };

        const typedData = createListingTypedData(request, chainIdValue);

        const messageForSigning = {
          from: request.from,
          collection: request.collection,
          tokenId: tokenId.toString(),
          price: priceWei,
          nonce: nonce.toString(),
          deadline: deadline.toString(),
        };

        const signature = await signTypedData({
          domain: typedData.domain,
          types: typedData.types,
          primaryType: typedData.primaryType,
          message: messageForSigning,
        });

        return {
          signature,
          request,
          deadline,
          nonce,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to sign request";
        setError(errorMessage);
        throw err;
      } finally {
        setIsSigning(false);
      }
    },
    [address, fetchNonce, getChainId, signTypedData]
  );

  // Sign an offer request
  const signOfferRequest = useCallback(
    async (
      collection: string,
      tokenId: number,
      amountWei: string
    ): Promise<SignResult> => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      setIsSigning(true);
      setError(null);

      try {
        const nonce = await fetchNonce(address);
        const deadline = getDeadline();
        const chainIdValue = getChainId();

        const request: OfferRequest = {
          from: address,
          collection,
          tokenId,
          amount: amountWei,
          nonce,
          deadline,
        };

        const typedData = createOfferTypedData(request, chainIdValue);

        const messageForSigning = {
          from: request.from,
          collection: request.collection,
          tokenId: tokenId.toString(),
          amount: amountWei,
          nonce: nonce.toString(),
          deadline: deadline.toString(),
        };

        const signature = await signTypedData({
          domain: typedData.domain,
          types: typedData.types,
          primaryType: typedData.primaryType,
          message: messageForSigning,
        });

        return {
          signature,
          request,
          deadline,
          nonce,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to sign request";
        setError(errorMessage);
        throw err;
      } finally {
        setIsSigning(false);
      }
    },
    [address, fetchNonce, getChainId, signTypedData]
  );

  // Sign a personal message (for authentication, etc.)
  const signPersonalMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      setIsSigning(true);
      setError(null);

      try {
        const provider = getProvider();

        const signature = await provider.request({
          method: "personal_sign",
          params: [message, address],
        });

        return signature;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to sign message";
        setError(errorMessage);
        throw err;
      } finally {
        setIsSigning(false);
      }
    },
    [address, getProvider]
  );

  return {
    signMintRequest,
    signListingRequest,
    signOfferRequest,
    signPersonalMessage,
    isSigning,
    error,
  };
}
