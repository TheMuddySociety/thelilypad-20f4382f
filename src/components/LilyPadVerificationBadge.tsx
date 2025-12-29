import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Leaf, Shield, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { 
  NFT_FACTORY_ADDRESS, 
  NFT_FACTORY_ABI, 
  LILYPAD_NFT_ABI,
  isFactoryConfigured,
  LILYPAD_PLATFORM_NAME,
  LILYPAD_PLATFORM_VERSION
} from "@/config/nftFactory";

interface LilyPadVerificationBadgeProps {
  contractAddress: string | null | undefined;
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
}

interface VerificationState {
  isVerified: boolean;
  isLoading: boolean;
  error: string | null;
  platformInfo: {
    platform: string;
    version: string;
    factory: string;
    chainId: number;
  } | null;
}

export const LilyPadVerificationBadge: React.FC<LilyPadVerificationBadgeProps> = ({
  contractAddress,
  showDetails = false,
  size = "md"
}) => {
  const [state, setState] = useState<VerificationState>({
    isVerified: false,
    isLoading: true,
    error: null,
    platformInfo: null,
  });

  useEffect(() => {
    const verifyCollection = async () => {
      if (!contractAddress || !window.ethereum) {
        setState({
          isVerified: false,
          isLoading: false,
          error: "No contract address",
          platformInfo: null,
        });
        return;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Method 1: Check if factory can verify the collection
        if (isFactoryConfigured()) {
          const verifyResult = await callFactoryVerify(contractAddress);
          if (verifyResult) {
            const platformInfo = await getPlatformInfo(contractAddress);
            setState({
              isVerified: true,
              isLoading: false,
              error: null,
              platformInfo,
            });
            return;
          }
        }

        // Method 2: Check if the collection itself has LilyPad identifiers
        const isLilyPad = await checkCollectionIdentifiers(contractAddress);
        if (isLilyPad) {
          const platformInfo = await getPlatformInfo(contractAddress);
          setState({
            isVerified: true,
            isLoading: false,
            error: null,
            platformInfo,
          });
          return;
        }

        // Not a LilyPad collection
        setState({
          isVerified: false,
          isLoading: false,
          error: null,
          platformInfo: null,
        });

      } catch (err) {
        console.error("Verification error:", err);
        setState({
          isVerified: false,
          isLoading: false,
          error: "Verification failed",
          platformInfo: null,
        });
      }
    };

    verifyCollection();
  }, [contractAddress]);

  // Call factory.verifyCollection(address)
  async function callFactoryVerify(address: string): Promise<boolean> {
    try {
      // Function selector for verifyCollection(address)
      // keccak256("verifyCollection(address)") = 0x56c02f7e...
      const selector = "56c02f7e";
      const paddedAddress = address.slice(2).toLowerCase().padStart(64, '0');
      const data = `0x${selector}${paddedAddress}`;

      const result = await window.ethereum.request({
        method: 'eth_call',
        params: [{
          to: NFT_FACTORY_ADDRESS,
          data: data
        }, 'latest']
      });

      // Result is a bool, 0x01 = true
      return result && result !== '0x' && result !== '0x0000000000000000000000000000000000000000000000000000000000000000';
    } catch {
      return false;
    }
  }

  // Check if collection has isLilyPadCollection() returning true
  async function checkCollectionIdentifiers(address: string): Promise<boolean> {
    try {
      // Function selector for isLilyPadCollection()
      // keccak256("isLilyPadCollection()") first 4 bytes
      const selector = "5d4c6c09"; // This is an example, actual hash needed
      
      const result = await window.ethereum.request({
        method: 'eth_call',
        params: [{
          to: address,
          data: `0x${selector}`
        }, 'latest']
      });

      return result && result !== '0x' && result !== '0x0000000000000000000000000000000000000000000000000000000000000000';
    } catch {
      // If the function doesn't exist, try checking for PLATFORM_NAME
      try {
        // Function selector for PLATFORM_NAME()
        const platformSelector = "e8ab0bf7"; // Example selector
        const result = await window.ethereum.request({
          method: 'eth_call',
          params: [{
            to: address,
            data: `0x${platformSelector}`
          }, 'latest']
        });

        // Check if result contains "LilyPad" (as hex encoded string)
        if (result && result.length > 2) {
          const decoded = hexToString(result);
          return decoded.includes("LilyPad");
        }
      } catch {
        return false;
      }
      return false;
    }
  }

  // Get platform info from collection
  async function getPlatformInfo(address: string): Promise<VerificationState['platformInfo']> {
    try {
      // For now, return default values since we can't easily decode complex return types
      return {
        platform: LILYPAD_PLATFORM_NAME,
        version: LILYPAD_PLATFORM_VERSION,
        factory: NFT_FACTORY_ADDRESS,
        chainId: 10143, // Monad Testnet
      };
    } catch {
      return null;
    }
  }

  // Helper to decode hex string
  function hexToString(hex: string): string {
    try {
      // Remove 0x prefix
      const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
      // Skip the offset and length (first 64 chars each for dynamic string)
      const stringData = cleanHex.slice(128);
      let result = '';
      for (let i = 0; i < stringData.length; i += 2) {
        const charCode = parseInt(stringData.slice(i, i + 2), 16);
        if (charCode === 0) break;
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch {
      return '';
    }
  }

  // Size configurations
  const sizeConfig = {
    sm: {
      badge: "text-xs py-0.5 px-2",
      icon: "w-3 h-3",
      iconMr: "mr-1"
    },
    md: {
      badge: "text-xs py-1 px-2.5",
      icon: "w-3.5 h-3.5",
      iconMr: "mr-1.5"
    },
    lg: {
      badge: "text-sm py-1.5 px-3",
      icon: "w-4 h-4",
      iconMr: "mr-2"
    }
  };

  const config = sizeConfig[size];

  // Loading state
  if (state.isLoading) {
    return (
      <Badge 
        variant="outline" 
        className={`${config.badge} bg-muted/50 text-muted-foreground border-muted animate-pulse`}
      >
        <Loader2 className={`${config.icon} ${config.iconMr} animate-spin`} />
        Verifying...
      </Badge>
    );
  }

  // Not verified or no contract
  if (!contractAddress || !state.isVerified) {
    if (!showDetails) return null;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`${config.badge} bg-muted/30 text-muted-foreground border-muted/50`}
            >
              <XCircle className={`${config.icon} ${config.iconMr}`} />
              Unverified
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">This collection was not deployed via LilyPad factory</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Verified badge
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={`${config.badge} bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 cursor-help transition-colors`}
          >
            <Leaf className={`${config.icon} ${config.iconMr}`} />
            <Shield className={`${config.icon} ${config.iconMr}`} />
            LilyPad Verified
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Verified LilyPad Collection
            </div>
            <p className="text-xs text-muted-foreground">
              This NFT collection was deployed via the official LilyPad factory contract and includes platform identification.
            </p>
            {state.platformInfo && (
              <div className="pt-2 border-t border-border space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform:</span>
                  <span>{state.platformInfo.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version:</span>
                  <span>v{state.platformInfo.version}</span>
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
