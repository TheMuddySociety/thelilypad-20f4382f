# Introduction

## What is The Lily Pad?

The Lily Pad is a next-generation NFT launchpad and streaming platform built on the Monad blockchain. It provides creators with the tools they need to launch successful NFT collections while engaging with their community through live streaming.

## Why Monad?

Monad is a high-performance EVM-compatible blockchain that offers:

- **10,000+ TPS**: Handle large mint events without congestion
- **Sub-second finality**: Instant transaction confirmation
- **Low fees**: Affordable minting for creators and collectors
- **EVM compatibility**: Use familiar tools like MetaMask

## Platform Features

### For Creators

| Feature | Description |
|---------|-------------|
| **Easy Collection Setup** | Create collections with custom traits, phases, and allowlists |
| **Multi-Phase Minting** | Team, partners, allowlist, and public phases |
| **Revenue Control** | Set prices, royalties, and max supply |
| **Content Moderation** | AI-powered moderation for trait images |
| **Live Streaming** | Stream while your collection mints |

### For Collectors

| Feature | Description |
|---------|-------------|
| **Seamless Minting** | One-click minting with gas estimation |
| **Network Awareness** | Automatic network detection and switching |
| **Balance Checking** | Know if you have enough before minting |
| **Real-time Updates** | Live supply tracking |
| **Testnet Mode** | Practice minting without real tokens |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
├─────────────────────────────────────────────────────────┤
│  Wallet Provider  │  Network Switch  │  NFT Components  │
├─────────────────────────────────────────────────────────┤
│                   Supabase Backend                       │
│    Edge Functions  │  Database  │  Storage  │  Auth     │
├─────────────────────────────────────────────────────────┤
│                  Monad Blockchain                        │
│         Mainnet (10143)  │  Testnet (10144)             │
└─────────────────────────────────────────────────────────┘
```

## Getting Started

Ready to dive in? Check out our [Quick Start Guide](./quick-start.md) to get up and running in minutes.
