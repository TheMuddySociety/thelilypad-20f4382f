# Network Switching

The Lily Pad supports both Monad Mainnet and Testnet, with easy switching between networks.

## Networks Overview

| Network | Chain ID | Purpose |
|---------|----------|---------|
| Monad Mainnet | 10143 | Production environment with real MON |
| Monad Testnet | 10144 | Testing environment with test MON |

## Network Configuration

### Mainnet

```typescript
{
  id: 10143,
  name: "Monad Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: ["https://monad-mainnet.g.alchemy.com/v2/YOUR_API_KEY"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://explorer.monad.xyz",
    },
  },
}
```

### Testnet

```typescript
{
  id: 10144,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: ["https://monad-testnet.g.alchemy.com/v2/YOUR_API_KEY"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Testnet Explorer",
      url: "https://testnet.explorer.monad.xyz",
    },
  },
}
```

## Using the Network Switch

### UI Component

The `NetworkSwitch` component appears in the navigation bar:

```tsx
import { NetworkSwitch } from "@/components/wallet/NetworkSwitch";

// Displays:
// - Current network badge (Mainnet/Testnet)
// - Toggle switch
// - Faucet link (on testnet)
```

### Programmatic Switching

```typescript
const { network, switchNetwork, isConnected } = useWallet();

// Switch to testnet
switchNetwork("testnet");

// Switch to mainnet
switchNetwork("mainnet");

// Note: Must disconnect wallet first
if (isConnected) {
  console.log("Please disconnect to switch networks");
}
```

## Testnet Banner

When on testnet, a global banner appears at the top of all pages:

```
┌─────────────────────────────────────────────────────────┐
│ 🧪 You are viewing the Monad Testnet — Get Test MON   │
└─────────────────────────────────────────────────────────┘
```

Features:
- Visible on all pages
- Includes faucet link
- Clear visual indicator
- Automatically adjusts navbar position

## Testnet Faucet

Get free test tokens when on testnet:

1. Toggle to testnet mode
2. Click the **Faucet** button
3. Visit https://faucet.monad.xyz
4. Enter your wallet address
5. Receive test MON

## Network Detection

The platform automatically detects wrong networks:

```typescript
const { chainId, currentChain, isConnected } = useWallet();

const isWrongNetwork = isConnected && chainId !== currentChain.id;

if (isWrongNetwork) {
  // Show "Switch Network" button
  await switchToMonad();
}
```

## Automatic Network Addition

If the Monad network isn't in the user's wallet, it will be automatically added:

```typescript
await window.ethereum.request({
  method: "wallet_addEthereumChain",
  params: [{
    chainId: `0x${currentChain.id.toString(16)}`,
    chainName: currentChain.name,
    nativeCurrency: currentChain.nativeCurrency,
    rpcUrls: [currentChain.rpcUrls.default.http[0]],
    blockExplorerUrls: [currentChain.blockExplorers.default.url],
  }],
});
```

## Best Practices

### Development Workflow

1. **Start on Testnet**: Always develop and test on testnet first
2. **Get Test Tokens**: Use the faucet for testing
3. **Test All Flows**: Minting, transactions, error handling
4. **Switch to Mainnet**: Only when ready for production

### User Experience

- Always show current network clearly
- Warn before mainnet transactions
- Provide easy network switching
- Include faucet access on testnet

## Persistence

Network preference is saved to localStorage:

```typescript
// Save network preference
localStorage.setItem("monadNetwork", "testnet");

// Load on app start
const savedNetwork = localStorage.getItem("monadNetwork") as NetworkType;
```

## Hook Usage

```typescript
import { useWallet } from "@/providers/WalletProvider";

function NetworkInfo() {
  const { network, currentChain, isConnected } = useWallet();
  
  return (
    <div>
      <p>Current Network: {currentChain.name}</p>
      <p>Chain ID: {currentChain.id}</p>
      <p>Mode: {network}</p>
      <p>Connected: {isConnected ? "Yes" : "No"}</p>
    </div>
  );
}
```

## Testnet Offset Hook

For components that need to account for the testnet banner:

```typescript
import { useTestnetOffset } from "@/hooks/useTestnetOffset";

function MyComponent() {
  const { isTestnet, bannerHeight, paddingClass } = useTestnetOffset();
  
  return (
    <div className={paddingClass}>
      {/* Content adjusts for banner */}
    </div>
  );
}
```
