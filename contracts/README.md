# Lily Pad NFT Factory Contracts

Smart contracts for deploying NFT collections on Monad.

## Contracts

- **NFTFactory.sol** - Factory contract that deploys new NFT collections
- **LilyPadNFT.sol** - ERC721 NFT contract with phases, allowlists, and royalties

## Deployment Guide

### Prerequisites

1. Install [Foundry](https://book.getfoundry.sh/getting-started/installation) or [Hardhat](https://hardhat.org/getting-started/)
2. Get testnet MON from the [Monad Faucet](https://faucet.monad.xyz)
3. Have a wallet private key with testnet funds

### Option 1: Deploy with Foundry

```bash
# Install Foundry if not already installed
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Navigate to contracts directory
cd contracts

# Deploy to Monad Testnet
forge create --rpc-url https://testnet-rpc.monad.xyz \
  --private-key YOUR_PRIVATE_KEY \
  NFTFactory.sol:NFTFactory
```

### Option 2: Deploy with Remix IDE (Easiest)

1. Go to [Remix IDE](https://remix.ethereum.org)
2. Create new files and paste the contract code:
   - `NFTFactory.sol`
   - `LilyPadNFT.sol`
3. Compile both contracts (Solidity 0.8.20+)
4. Connect MetaMask to Monad Testnet:
   - Network Name: Monad Testnet
   - RPC URL: `https://testnet-rpc.monad.xyz`
   - Chain ID: `10143`
   - Currency: MON
   - Explorer: `https://testnet.monadexplorer.com`
5. Deploy `NFTFactory` contract
6. Copy the deployed contract address

### Option 3: Deploy with Hardhat

```bash
# Create a new Hardhat project
mkdir nft-factory && cd nft-factory
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Initialize Hardhat
npx hardhat init

# Copy contracts to contracts/ folder
# Update hardhat.config.js with Monad network:
```

```javascript
// hardhat.config.js
module.exports = {
  solidity: "0.8.20",
  networks: {
    monadTestnet: {
      url: "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

```bash
# Deploy
npx hardhat run scripts/deploy.js --network monadTestnet
```

## After Deployment

Once deployed, update the factory address in your Lily Pad app:

1. Open `src/config/nftFactory.ts`
2. Replace the zero address with your deployed factory address:

```typescript
export const NFT_FACTORY_ADDRESS = "0xYOUR_DEPLOYED_ADDRESS_HERE";
```

3. The app will now use the factory to create NFT collections!

## Contract Addresses

| Network | Factory Address |
|---------|-----------------|
| Monad Testnet | `TBD - Deploy and update` |
| Monad Mainnet | `TBD - Coming soon` |

## Testing

```bash
# With Foundry
forge test

# With Hardhat
npx hardhat test
```

## Verification

After deployment, verify on Monad Explorer:

```bash
# Foundry
forge verify-contract --chain-id 10143 \
  --constructor-args $(cast abi-encode "constructor()") \
  YOUR_CONTRACT_ADDRESS \
  NFTFactory

# Or use the Monad Explorer UI
```

## Gas Estimates

- Factory Deployment: ~2,000,000 gas
- Create Collection: ~1,500,000 gas
- Mint NFT: ~100,000 gas per NFT

## Security Considerations

- Factory owner can pause/unpause collection creation
- Each NFT collection owner can configure phases independently
- Royalties are set at collection creation and stored on-chain
- Withdraw function only available to collection owner
