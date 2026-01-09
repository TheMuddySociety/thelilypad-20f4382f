import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

// Phantom App ID from Phantom Portal
export const PHANTOM_APP_ID = "719e4a2a-a504-4d66-ad15-5566daecb361";

// Get redirect URL based on environment
const getRedirectUrl = () => {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin.includes("thelilypad.fun")) {
      return "https://thelilypad.fun/auth/callback";
    }
    return `${origin}/auth/callback`;
  }
  return "https://thelilypad.fun/auth/callback";
};

// Singleton SDK instance
let phantomSDK: BrowserSDK | null = null;

export const getPhantomSDK = (): BrowserSDK => {
  if (!phantomSDK) {
    phantomSDK = new BrowserSDK({
      // @ts-ignore - The types in the package might be slightly different than the snippet, but we follow user instruction
      providerType: "embedded",
      // @ts-ignore
      providers: ["google", "apple", "injected"], // Keeping this for backward compatibility if the SDK supports both or falls back
      addressTypes: [AddressType.ethereum, AddressType.solana, AddressType.bitcoinSegwit, AddressType.sui],
      appId: PHANTOM_APP_ID,
      authOptions: {
        authUrl: "https://connect.phantom.app/login",
        redirectUrl: getRedirectUrl(),
      },
    });
  }
  return phantomSDK;
};

export const resetPhantomSDK = () => {
  phantomSDK = null;
};

// Wait for Phantom extension to be available
export const waitForPhantomExtension = (timeout = 3000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.phantom?.ethereum || window.phantom?.solana) {
      resolve(true);
      return;
    }

    const checkInterval = 100;
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += checkInterval;
      if (window.phantom?.ethereum || window.phantom?.solana) {
        clearInterval(interval);
        resolve(true);
      } else if (elapsed >= timeout) {
        clearInterval(interval);
        resolve(false);
      }
    }, checkInterval);
  });
};

export { AddressType };
