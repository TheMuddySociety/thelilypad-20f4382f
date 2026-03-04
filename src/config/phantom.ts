// Phantom App ID from Phantom Portal
export const PHANTOM_APP_ID = "719e4a2a-a504-4d66-ad15-5566daecb361";

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
      if ((window as any).phantom?.ethereum || (window as any).phantom?.solana) {
        clearInterval(interval);
        resolve(true);
      } else if (elapsed >= timeout) {
        clearInterval(interval);
        resolve(false);
      }
    }, checkInterval);
  });
};
