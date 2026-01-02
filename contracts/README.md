# TheLilyPadLaunchpad - NFT Contracts

Smart contracts for the Lily Pad NFT platform on Monad.

## Active Contract

**TheLilyPadLaunchpad** - `0xE9fbe48cc99E3ee6b41DE2BF830df02D1e14b651`

This is the primary NFT contract for the platform. It is already deployed and ready to use.

## Available Contracts

| Contract | Description |
|----------|-------------|
| **TheLilyPad.sol** | Main ERC721 NFT contract with phases, allowlists, and royalties |
| **TheLilyPadUpgradeable.sol** | Upgradeable version using UUPS proxy pattern |
| **LilyPadNFT.sol** | Standard NFT implementation |
| **SimpleLilyPadNFT.sol** | Minimal NFT implementation |
| **LilyPadToken.sol** | Platform governance token |
| **LilyPadGovernor.sol** | Governance contract for proposals and voting |
| **LilyPadTimelock.sol** | Timelock for governance execution |
| **BuybackController.sol** | Manages platform buyback mechanics |

## Contract Addresses

| Network | Contract | Address |
|---------|----------|---------|
| Monad Testnet | TheLilyPadLaunchpad | `0xE9fbe48cc99E3ee6b41DE2BF830df02D1e14b651` |
| Monad Mainnet | Coming soon | TBD |

## Features

- **Multi-phase minting**: Configure different mint phases with unique prices and limits
- **Allowlist support**: Restrict minting to approved addresses per phase
- **Platform fees**: 2.5% platform fee with 50% going to buyback pool
- **Royalties**: EIP-2981 royalty support for secondary sales
- **LilyPad verified**: All collections are verifiable as authentic Lily Pad drops

## Deployment Guide

### Deploy with Remix IDE

1. Go to [Remix IDE](https://remix.ethereum.org)
2. Create new file and paste the contract code
3. Compile (Solidity 0.8.20+)
4. Connect MetaMask to Monad Testnet:
   - Network Name: Monad Testnet
   - RPC URL: `https://testnet-rpc.monad.xyz`
   - Chain ID: `10143`
   - Currency: MON
   - Explorer: `https://testnet.monadexplorer.com`
5. Deploy contract
6. Update `src/config/nftFactory.ts` with new address

## Gas Estimates

- Contract Deployment: ~2,000,000 gas
- Configure Phase: ~50,000 gas
- Mint NFT: ~100,000 gas per NFT
- Set Allowlist: ~30,000 gas per address

## Security

- Only contract owner can configure phases and manage allowlists
- Platform fees are automatically distributed
- Withdraw function only available to collection owner
- All collections are immutably linked to the Lily Pad platform
