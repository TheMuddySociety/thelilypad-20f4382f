# Wallet Integration

The Lily Pad uses a custom React-based wallet provider for seamless Web3 integration with the Monad blockchain.

## Supported Wallets

Currently supported:
- ✅ MetaMask
- ✅ Any EIP-1193 compatible wallet

## Connecting Your Wallet

### For Users

1. Click **Connect Wallet** in the navigation bar
2. MetaMask will prompt you to connect
3. Approve the connection
4. Your address and balance will be displayed

### For Developers

The wallet functionality is provided through the `WalletProvider` context:

```typescript
import { useWallet } from "@/providers/WalletProvider";

function MyComponent() {
  const { 
    address,
    isConnected,
    balance,
    connect,
    disconnect,
    chainId,
    network,
    currentChain
  } = useWallet();

  return (
    <div>
      {isConnected ? (
        <p>Connected: {address}</p>
      ) : (
        <button onClick={connect}>Connect Wallet</button>
      )}
    </div>
  );
}
```

## Wallet State

The `useWallet` hook provides the following state:

| Property | Type | Description |
|----------|------|-------------|
| `address` | `string \| null` | Connected wallet address |
| `isConnected` | `boolean` | Whether a wallet is connected |
| `isConnecting` | `boolean` | Connection in progress |
| `balance` | `string \| null` | Native token balance in MON |
| `chainId` | `number \| null` | Current chain ID |
| `network` | `"mainnet" \| "testnet"` | Selected network mode |
| `currentChain` | `Chain` | Current chain configuration |

## Wallet Methods

| Method | Description |
|--------|-------------|
| `connect()` | Initiates wallet connection |
| `disconnect()` | Disconnects the wallet |
| `switchToMonad()` | Switches to the selected Monad network |
| `switchNetwork(network)` | Switches between mainnet/testnet |
| `sendTransaction(to, amount)` | Sends a transaction |

## Auto-Connection

The wallet provider automatically reconnects if the user was previously connected:

```typescript
// Stored in localStorage
localStorage.getItem("walletConnected") // "true" or null
localStorage.getItem("monadNetwork")    // "mainnet" or "testnet"
```

## Event Handling

The provider listens for wallet events:

```typescript
// Account changes
window.ethereum.on("accountsChanged", handleAccountsChanged);

// Network changes  
window.ethereum.on("chainChanged", handleChainChanged);
```

## Network Detection

Check if the user is on the correct network:

```typescript
const { chainId, currentChain, isConnected } = useWallet();
const isWrongNetwork = isConnected && chainId !== currentChain.id;

if (isWrongNetwork) {
  // Prompt user to switch networks
}
```

## Balance Display

Format the balance for display:

```typescript
const { balance } = useWallet();

const formatBalance = (bal: string | null) => {
  if (!bal) return "0.00";
  return parseFloat(bal).toFixed(4);
};

// Display: "1.2345 MON"
```

## Security Considerations

- Never expose private keys in your code
- Always verify transactions before signing
- Use testnet for development and testing
- Validate addresses before sending transactions

## Components

### ConnectWallet

Pre-built button component for wallet connection:

```tsx
import { ConnectWallet } from "@/components/wallet/ConnectWallet";

<ConnectWallet 
  variant="default" 
  size="sm" 
  className="my-custom-class" 
/>
```

### NetworkSwitch

Toggle between mainnet and testnet:

```tsx
import { NetworkSwitch } from "@/components/wallet/NetworkSwitch";

<NetworkSwitch />
```

## Troubleshooting

### MetaMask Not Detected
```typescript
if (typeof window.ethereum === "undefined") {
  alert("Please install MetaMask");
}
```

### Wrong Network
The platform will display a "Switch Network" button when on an incorrect network.

### Transaction Failed
Check console for errors and ensure sufficient balance for gas.
