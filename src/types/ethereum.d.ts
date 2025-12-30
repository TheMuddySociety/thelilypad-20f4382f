interface EthereumProvider {
  isMetaMask?: boolean;
  isPhantom?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
}

interface PhantomProvider {
  ethereum?: EthereumProvider;
  solana?: {
    isPhantom?: boolean;
    connect: () => Promise<{ publicKey: { toString: () => string } }>;
    disconnect: () => Promise<void>;
    signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  };
}

interface Window {
  ethereum?: EthereumProvider;
  phantom?: PhantomProvider;
}
