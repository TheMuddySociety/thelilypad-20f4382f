import { useWallet } from "@/providers/WalletProvider";

export const useTestnetOffset = () => {
  const { network } = useWallet();
  const isTestnet = network === "testnet";
  
  // Banner height is approximately 36px
  const bannerHeight = isTestnet ? 36 : 0;
  
  return {
    isTestnet,
    bannerHeight,
    // CSS class to add extra top padding when on testnet
    paddingClass: isTestnet ? "pt-[36px]" : "",
    // For inline styles
    topOffset: bannerHeight,
  };
};
