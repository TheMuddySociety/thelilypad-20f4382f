import { BrowserSDK, AddressType, waitForPhantomExtension, isMobileDevice, getDeeplinkToPhantom } from "@phantom/browser-sdk";

// Phantom App ID from Phantom Portal
export const PHANTOM_APP_ID = "719e4a2a-a504-4d66-ad15-5566daecb361";

// Get the current app URL for redirect
const getRedirectUrl = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }
  return "https://localhost:5173/auth/callback";
};

// Create SDK instance with support for both embedded (OAuth) and injected (extension) wallets
export const createPhantomSDK = () => {
  return new BrowserSDK({
    providers: ["google", "apple", "injected"], // OAuth providers + browser extension
    addressTypes: [AddressType.ethereum, AddressType.solana],
    appId: PHANTOM_APP_ID,
    authOptions: {
      authUrl: "https://connect.phantom.app/login",
      redirectUrl: getRedirectUrl(),
    },
  });
};

// Create SDK instance for injected wallet only (browser extension)
export const createInjectedOnlySDK = () => {
  return new BrowserSDK({
    providers: ["injected"],
    addressTypes: [AddressType.ethereum, AddressType.solana],
    appId: PHANTOM_APP_ID,
  });
};

// Singleton instance
let phantomSDK: BrowserSDK | null = null;

export const getPhantomSDK = () => {
  if (!phantomSDK) {
    phantomSDK = createPhantomSDK();
  }
  return phantomSDK;
};

// Reset SDK (useful for testing or reconnection)
export const resetPhantomSDK = () => {
  phantomSDK = null;
};

// Export utilities
export { 
  AddressType, 
  waitForPhantomExtension, 
  isMobileDevice, 
  getDeeplinkToPhantom 
};

// Type exports
export type { 
  AuthOptions, 
  ConnectResult, 
  InjectedWalletInfo 
} from "@phantom/browser-sdk";
