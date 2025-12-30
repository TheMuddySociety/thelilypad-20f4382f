import { useState, useEffect, useCallback } from "react";
import { 
  NFT_FACTORY_ADDRESS, 
  isFactoryConfigured,
  LILYPAD_PLATFORM_NAME,
  LILYPAD_PLATFORM_VERSION
} from "@/config/nftFactory";

export interface LilyPadPlatformInfo {
  platform: string;
  version: string;
  factory: string;
  chainId: number;
}

export interface VerificationResult {
  isVerified: boolean;
  isLoading: boolean;
  error: string | null;
  platformInfo: LilyPadPlatformInfo | null;
  refetch: () => void;
}

// Helper to get any available EVM provider
const getAnyEVMProvider = (): EthereumProvider | null => {
  if (typeof window === 'undefined') return null;
  if (window.phantom?.ethereum) return window.phantom.ethereum;
  if (window.ethereum) return window.ethereum;
  return null;
};

/**
 * Hook to verify if an NFT collection was deployed via LilyPad factory.
 * Checks both the factory's verification mapping and the collection's own identifiers.
 */
export function useVerifyLilyPadCollection(contractAddress: string | null | undefined): VerificationResult {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformInfo, setPlatformInfo] = useState<LilyPadPlatformInfo | null>(null);

  const verify = useCallback(async () => {
    const provider = getAnyEVMProvider();
    if (!contractAddress || !provider) {
      setIsVerified(false);
      setIsLoading(false);
      setError(contractAddress ? "No Ethereum provider" : "No contract address");
      setPlatformInfo(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Method 1: Check via factory's verifyCollection mapping
      if (isFactoryConfigured()) {
        const factoryVerified = await callFactoryVerify(contractAddress);
        if (factoryVerified) {
          const info = await getPlatformInfoFromCollection(contractAddress);
          setIsVerified(true);
          setPlatformInfo(info);
          setIsLoading(false);
          return;
        }
      }

      // Method 2: Check if collection has LilyPad identifiers directly
      const hasIdentifiers = await checkCollectionIdentifiers(contractAddress);
      if (hasIdentifiers) {
        const info = await getPlatformInfoFromCollection(contractAddress);
        setIsVerified(true);
        setPlatformInfo(info);
        setIsLoading(false);
        return;
      }

      // Not a LilyPad collection
      setIsVerified(false);
      setPlatformInfo(null);
      setIsLoading(false);

    } catch (err) {
      console.error("LilyPad verification error:", err);
      setIsVerified(false);
      setError("Verification failed");
      setPlatformInfo(null);
      setIsLoading(false);
    }
  }, [contractAddress]);

  useEffect(() => {
    verify();
  }, [verify]);

  return {
    isVerified,
    isLoading,
    error,
    platformInfo,
    refetch: verify,
  };
}

/**
 * Call factory.verifyCollection(address) to check if collection is registered
 */
async function callFactoryVerify(address: string): Promise<boolean> {
  const provider = getAnyEVMProvider();
  if (!provider) return false;
  
  try {
    // Function selector for verifyCollection(address)
    // bytes4(keccak256("verifyCollection(address)")) = 0x56c02f7e
    const selector = "56c02f7e";
    const paddedAddress = address.slice(2).toLowerCase().padStart(64, '0');
    const data = `0x${selector}${paddedAddress}`;

    const result = await provider.request({
      method: 'eth_call',
      params: [{
        to: NFT_FACTORY_ADDRESS,
        data: data
      }, 'latest']
    });

    // Result is a bool encoded as uint256, non-zero = true
    return result && 
           result !== '0x' && 
           result !== '0x0000000000000000000000000000000000000000000000000000000000000000';
  } catch {
    return false;
  }
}

/**
 * Check if collection contract has LilyPad identifiers
 * Tries isLilyPadCollection() first, then falls back to PLATFORM_NAME()
 */
async function checkCollectionIdentifiers(address: string): Promise<boolean> {
  const provider = getAnyEVMProvider();
  if (!provider) return false;
  
  // Try isLilyPadCollection() - pure function that returns true
  try {
    // bytes4(keccak256("isLilyPadCollection()")) 
    const isLilyPadSelector = "5d4c6c09";
    
    const result = await provider.request({
      method: 'eth_call',
      params: [{
        to: address,
        data: `0x${isLilyPadSelector}`
      }, 'latest']
    });

    if (result && 
        result !== '0x' && 
        result !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return true;
    }
  } catch {
    // Function doesn't exist, try alternative
  }

  // Try PLATFORM_NAME() and check if it contains "LilyPad"
  try {
    // bytes4(keccak256("PLATFORM_NAME()"))
    const platformNameSelector = "e8ab0bf7";
    
    const result = await provider.request({
      method: 'eth_call',
      params: [{
        to: address,
        data: `0x${platformNameSelector}`
      }, 'latest']
    });

    if (result && result.length > 2) {
      const decoded = decodeString(result);
      return decoded.toLowerCase().includes("lilypad");
    }
  } catch {
    // Function doesn't exist
  }

  return false;
}

/**
 * Get platform info from the collection contract
 */
async function getPlatformInfoFromCollection(address: string): Promise<LilyPadPlatformInfo> {
  const provider = getAnyEVMProvider();
  let platform = LILYPAD_PLATFORM_NAME;
  let version = LILYPAD_PLATFORM_VERSION;
  let factory = NFT_FACTORY_ADDRESS;
  let chainId = 10143; // Default to Monad Testnet

  if (!provider) return { platform, version, factory, chainId };

  // Try to get PLATFORM_NAME
  try {
    const platformNameSelector = "e8ab0bf7";
    const result = await provider.request({
      method: 'eth_call',
      params: [{ to: address, data: `0x${platformNameSelector}` }, 'latest']
    });
    if (result && result.length > 2) {
      const decoded = decodeString(result);
      if (decoded) platform = decoded;
    }
  } catch {}

  // Try to get PLATFORM_VERSION
  try {
    const versionSelector = "c4e41b22"; // bytes4(keccak256("PLATFORM_VERSION()"))
    const result = await provider.request({
      method: 'eth_call',
      params: [{ to: address, data: `0x${versionSelector}` }, 'latest']
    });
    if (result && result.length > 2) {
      const decoded = decodeString(result);
      if (decoded) version = decoded;
    }
  } catch {}

  // Try to get factory address
  try {
    const factorySelector = "c45a0155"; // bytes4(keccak256("factory()"))
    const result = await provider.request({
      method: 'eth_call',
      params: [{ to: address, data: `0x${factorySelector}` }, 'latest']
    });
    if (result && result.length >= 42) {
      factory = '0x' + result.slice(-40);
    }
  } catch {}

  // Try to get deployed chain ID
  try {
    const chainIdSelector = "aaf10f42"; // bytes4(keccak256("deployedOnChainId()"))
    const result = await provider.request({
      method: 'eth_call',
      params: [{ to: address, data: `0x${chainIdSelector}` }, 'latest']
    });
    if (result && result !== '0x') {
      chainId = parseInt(result, 16);
    }
  } catch {}

  return { platform, version, factory, chainId };
}

/**
 * Decode an ABI-encoded string from hex
 */
function decodeString(hex: string): string {
  try {
    // Remove 0x prefix
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    
    // For dynamic string: first 32 bytes = offset, next 32 bytes = length, then data
    if (cleanHex.length < 128) return '';
    
    // Get the length (bytes 32-64)
    const lengthHex = cleanHex.slice(64, 128);
    const length = parseInt(lengthHex, 16);
    
    if (length === 0 || isNaN(length)) return '';
    
    // Get the string data (starting at byte 64)
    const dataHex = cleanHex.slice(128, 128 + length * 2);
    
    let result = '';
    for (let i = 0; i < dataHex.length; i += 2) {
      const charCode = parseInt(dataHex.slice(i, i + 2), 16);
      if (charCode === 0) break;
      result += String.fromCharCode(charCode);
    }
    
    return result;
  } catch {
    return '';
  }
}

/**
 * Standalone function to verify a collection without using the hook
 * Useful for one-off checks or batch verification
 */
export async function verifyLilyPadCollection(contractAddress: string): Promise<{
  isVerified: boolean;
  platformInfo: LilyPadPlatformInfo | null;
}> {
  const provider = getAnyEVMProvider();
  if (!contractAddress || !provider) {
    return { isVerified: false, platformInfo: null };
  }

  try {
    // Check factory first
    if (isFactoryConfigured()) {
      const factoryVerified = await callFactoryVerify(contractAddress);
      if (factoryVerified) {
        const info = await getPlatformInfoFromCollection(contractAddress);
        return { isVerified: true, platformInfo: info };
      }
    }

    // Check collection identifiers
    const hasIdentifiers = await checkCollectionIdentifiers(contractAddress);
    if (hasIdentifiers) {
      const info = await getPlatformInfoFromCollection(contractAddress);
      return { isVerified: true, platformInfo: info };
    }

    return { isVerified: false, platformInfo: null };
  } catch {
    return { isVerified: false, platformInfo: null };
  }
}
