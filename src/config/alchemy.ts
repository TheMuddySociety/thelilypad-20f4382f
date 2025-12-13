import { defineChain } from "viem";

// PLACEHOLDER: Replace with your regenerated Alchemy API key
export const ALCHEMY_API_KEY = "YOUR_ALCHEMY_API_KEY_HERE";

// Monad Mainnet chain configuration
export const monadMainnet = defineChain({
  id: 10143,
  name: "Monad Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: [`https://monad-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
    },
    public: {
      http: [`https://monad-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://explorer.monad.xyz",
    },
  },
});

// Alchemy RPC endpoint
export const getAlchemyRpcUrl = () => 
  `https://monad-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
