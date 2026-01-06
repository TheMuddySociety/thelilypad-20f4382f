# The Lily Pad - Frontend Documentation

> A comprehensive Web3 streaming and NFT launchpad platform built on Monad & Solana blockchains.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Core Features](#core-features)
- [Components](#components)
- [Hooks](#hooks)
- [Pages](#pages)
- [Edge Functions](#edge-functions)
- [Providers](#providers)
- [Configuration](#configuration)
- [Design System](#design-system)
- [Blockchain Integration](#blockchain-integration)

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State Management** | TanStack Query (React Query) |
| **Routing** | React Router DOM v6 |
| **Backend** | Supabase (Database, Auth, Edge Functions, Storage) |
| **Blockchain (EVM)** | viem + MetaMask |
| **Blockchain (Solana)** | @solana/web3.js + Phantom SDK |
| **NFT Metadata** | Metaplex (Solana) |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod |
| **Mobile** | Capacitor |

---

## Project Structure

```
src/
├── assets/              # Static assets (images, logos)
├── components/          # Reusable UI components
│   ├── admin/           # Admin dashboard components
│   ├── blindbox/        # Blind box feature components
│   ├── chat/            # Chat & sticker components
│   ├── common/          # Shared utility components
│   ├── governance/      # DAO governance components
│   ├── launchpad/       # NFT launchpad components
│   ├── marketplace/     # Marketplace components
│   ├── music/           # Music NFT components
│   ├── raffles/         # Raffle system components
│   ├── sections/        # Homepage sections
│   ├── shop/            # Shop & bundles components
│   ├── stickers/        # Sticker pack components
│   ├── streaming/       # Live streaming components
│   ├── ui/              # shadcn/ui base components
│   ├── walkthrough/     # Onboarding walkthrough
│   └── wallet/          # Wallet management components
├── config/              # Blockchain & service configurations
├── hooks/               # Custom React hooks
├── integrations/        # Third-party integrations
│   └── supabase/        # Supabase client & types
├── lib/                 # Utility functions
├── pages/               # Route page components
├── providers/           # React context providers
└── types/               # TypeScript type definitions

supabase/
├── config.toml          # Supabase configuration
└── functions/           # Edge functions
    ├── admin-users/
    ├── alchemy-rpc/
    ├── cleanup-deleted-collections/
    ├── content-moderation/
    ├── draw-raffle-winners/
    ├── expire-bundles/
    ├── fetch-nft-floor-prices/
    ├── fetch-nfts/
    ├── ipfs-upload/
    ├── process-scheduled-reveals/
    ├── resolve-streak-challenges/
    ├── rpc-proxy/
    ├── track-clip-event/
    ├── track-volume/
    └── webrtc-stream/

contracts/               # Smart contract ABIs & source
docs/                    # Documentation files
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or bun
- MetaMask browser extension
- Phantom wallet (for Solana features)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

The project uses Lovable Cloud (Supabase) with auto-configured environment variables:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `VITE_SUPABASE_PROJECT_ID` - Project identifier

---

## Core Features

### 1. NFT Launchpad
- Multi-phase minting (allowlist, public, etc.)
- Layered NFT generation with trait rules
- Scheduled reveals with countdown
- IPFS metadata upload
- Contract deployment (Monad & Solana)

### 2. Marketplace
- NFT listings with offers system
- Collection browsing with filters
- Floor price tracking
- Volume analytics
- Sticker & emote packs

### 3. Live Streaming
- WebRTC-based streaming
- Live chat with reactions
- Clip creation
- Tipping system (MON & SOL)
- Streamer profiles & schedules

### 4. Music Store
- Music NFT minting
- Audio player with playlists
- Artist profiles
- Track metadata management

### 5. Governance (DAO)
- Proposal creation & voting
- Token delegation
- Voting power based on NFT holdings
- Timelock execution

### 6. Shop System
- Digital goods (stickers, emotes, overlays)
- Bundle deals with discounts
- Multi-currency support (MON/SOL)
- Creator earnings & claims

### 7. Gamification
- Trading streaks & challenges
- Volume achievements
- Leaderboards
- Badge system

---

## Components

### UI Components (`src/components/ui/`)

Built on shadcn/ui with Radix primitives:

| Component | Description |
|-----------|-------------|
| `Button` | Primary action buttons with variants |
| `Card` | Content container with header/footer |
| `Dialog` | Modal dialogs |
| `Dropdown` | Menu dropdowns |
| `Input` | Form inputs |
| `Select` | Selection dropdowns |
| `Tabs` | Tabbed interfaces |
| `Toast` | Notification toasts |
| `Tooltip` | Hover tooltips |

### Feature Components

#### Wallet Components (`src/components/wallet/`)

```typescript
// Connect wallet modal
<WalletSelectorModal />

// Display connected wallet
<ConnectWallet />

// Network switching
<NetworkSwitch />

// NFT display & transfer
<WalletNFTDetailModal />
<NFTTransferModal />
```

#### Launchpad Components (`src/components/launchpad/`)

```typescript
// Collection creation
<CreateCollectionModal />
<ArtworkUploader />
<LayerManager />

// Minting phases
<PhaseConfigManager />
<AllowlistManager />

// Reveal system
<RevealManager />
<NFTRevealAnimation />
```

#### Streaming Components (`src/components/streaming/`)

```typescript
// Go live interface
<BrowserStreamPreview />
<StreamControls />

// Viewer experience
<WebRTCViewer />
<LiveChat />
<TipModal />
```

### Common Components (`src/components/common/`)

```typescript
// Reusable patterns
<PageHeader title="..." description="..." />
<EmptyState icon={...} title="..." />
<StatsGrid stats={[...]} />
<FilterDropdown options={[...]} />
<SectionError message="..." onRetry={() => {}} />
```

---

## Hooks

### Wallet Hooks

| Hook | Purpose |
|------|---------|
| `useWalletNFTs` | Fetch NFTs owned by connected wallet |
| `useNFTTransfer` | Transfer NFT to another address |
| `useNFTFloorPrices` | Get collection floor prices |
| `useSPLTokens` | Fetch Solana SPL tokens |
| `useRpcFailover` | RPC endpoint failover logic |

### Contract Hooks

| Hook | Purpose |
|------|---------|
| `useContractDeploy` | Deploy NFT collection contract |
| `useContractMint` | Mint NFTs from contract |
| `useMarketplaceContract` | Marketplace interactions |
| `useTheLilyPadContract` | Platform contract functions |
| `useGovernance` | DAO voting & proposals |

### Data Hooks

| Hook | Purpose |
|------|---------|
| `useLaunchpadData` | Collection CRUD operations |
| `useMarketplaceData` | Listings & offers |
| `useDashboardAnalytics` | Creator dashboard stats |
| `useVolumeTracking` | Trading volume metrics |
| `useBuybackProgram` | Buyback pool data |

### Feature Hooks

| Hook | Purpose |
|------|---------|
| `useCreatorCurrency` | Currency preference (MON/SOL) |
| `useFeatureLocks` | Feature gating by followers |
| `useContentModeration` | AI content moderation |
| `useLiveNotifications` | Real-time notifications |
| `useUserPlaylists` | Music playlist management |

### Utility Hooks

| Hook | Purpose |
|------|---------|
| `useSEO` | Dynamic SEO meta tags |
| `useInfiniteScroll` | Pagination with scroll |
| `useOptimisticUpdate` | Optimistic UI updates |
| `useRealtimeSubscription` | Supabase realtime |
| `useNotificationSound` | Audio notifications |

---

## Pages

### Public Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Index` | Homepage with featured content |
| `/marketplace` | `Marketplace` | Browse NFT collections |
| `/collection/:id` | `CollectionDetail` | Collection page with minting |
| `/streamers` | `Streamers` | Discover streamers |
| `/streams` | `Streams` | Live streams list |
| `/watch/:id` | `Watch` | Watch live stream |
| `/music` | `MusicStore` | Browse music NFTs |

### Creator Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | `Dashboard` | Creator analytics |
| `/launchpad` | `Launchpad` | Manage collections |
| `/go-live` | `GoLive` | Start streaming |
| `/emotes` | `ChannelEmotes` | Manage emotes |
| `/my-sticker-packs` | `CreatorStickerPacks` | Manage stickers |

### User Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/wallet` | `WalletProfile` | Wallet & portfolio |
| `/my-nfts` | `MyNFTs` | Owned NFTs |
| `/my-purchases` | `MyPurchases` | Purchase history |
| `/following` | `Following` | Followed streamers |

### Platform Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/governance` | `Governance` | DAO voting |
| `/buyback` | `BuybackProgram` | Buyback info |
| `/raffles` | `Raffles` | Enter raffles |
| `/blind-boxes` | `BlindBoxes` | Mystery boxes |

### Admin Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/admin` | `AdminDashboard` | Platform admin |
| `/moderation` | `Moderation` | Content moderation |

---

## Edge Functions

### `admin-users`
Admin user management and role assignments.

### `alchemy-rpc`
Proxied Alchemy RPC calls for NFT data.

### `content-moderation`
AI-powered content moderation using OpenAI.

### `draw-raffle-winners`
Random winner selection for raffles.

### `expire-bundles`
Scheduled cleanup of expired bundles.

### `fetch-nft-floor-prices`
Aggregate floor prices from marketplaces.

### `fetch-nfts`
Fetch NFTs for wallet across chains.

### `ipfs-upload`
Upload metadata to IPFS via Pinata.

### `process-scheduled-reveals`
Execute scheduled NFT reveals.

### `resolve-streak-challenges`
Process trading streak challenges.

### `rpc-proxy`
Generic RPC proxy with rate limiting.

### `track-clip-event`
Analytics for clip views/shares.

### `track-volume`
Record trading volume metrics.

### `webrtc-stream`
WebRTC signaling for live streams.

---

## Providers

### `WalletProvider`
Manages wallet connection state for both EVM (MetaMask) and Solana (Phantom).

```typescript
interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  networkType: 'mainnet' | 'testnet';
  solanaAddress: string | null;
  isSolanaConnected: boolean;
}
```

### `AudioPlayerProvider`
Global audio player state for music NFTs.

```typescript
interface AudioPlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  playlist: Playlist | null;
}
```

---

## Configuration

### Blockchain Config (`src/config/`)

#### `theLilyPad.ts`
Platform contract addresses and ABIs.

#### `nftContract.ts`
NFT collection contract configuration.

#### `nftFactory.ts`
Factory contract for deploying collections.

#### `governance.ts`
DAO governance contract settings.

#### `solana.ts`
Solana network configuration.

#### `phantom.ts`
Phantom wallet integration.

#### `alchemy.ts`
Alchemy API configuration.

---

## Design System

### Color Tokens

The platform uses HSL-based semantic color tokens defined in `index.css`:

```css
:root {
  --background: 222 47% 11%;
  --foreground: 210 40% 98%;
  --primary: 142 76% 36%;
  --primary-foreground: 355 100% 97%;
  --secondary: 217 33% 17%;
  --muted: 217 33% 17%;
  --accent: 217 33% 17%;
  --destructive: 0 63% 31%;
  --border: 217 33% 17%;
  --ring: 142 76% 36%;
}
```

### Component Variants

Using `class-variance-authority` for consistent styling:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input bg-background",
        secondary: "bg-secondary text-secondary-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-to-r from-lily-green to-lily-green-light",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
  }
);
```

### Animation Patterns

Using Framer Motion for consistent animations:

```typescript
// Fade in
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
/>

// Staggered children
<motion.div
  variants={{
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }}
  initial="hidden"
  animate="show"
/>
```

---

## Blockchain Integration

### EVM (Monad)

```typescript
import { createPublicClient, http } from 'viem';
import { monadTestnet } from '@/config/theLilyPad';

const client = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});
```

### Solana

```typescript
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { createPhantom } from '@phantom/browser-sdk';

const connection = new Connection(clusterApiUrl('devnet'));
const phantom = createPhantom();
```

### Multi-Currency Support

The platform supports both MON (Monad native) and SOL currencies:

```typescript
// Check creator currency preference
const { data } = await supabase
  .from('streamer_profiles')
  .select('preferred_currency, sol_wallet_address')
  .eq('user_id', userId);

// Display price based on currency
const price = currency === 'SOL' ? item.price_sol : item.price_mon;
```

---

## Database Schema

Key tables in the Supabase database:

| Table | Purpose |
|-------|---------|
| `collections` | NFT collection metadata |
| `minted_nfts` | Individual minted NFTs |
| `nft_listings` | Marketplace listings |
| `nft_offers` | Purchase offers |
| `streamer_profiles` | Streamer information |
| `streams` | Live stream records |
| `earnings` | Creator earnings |
| `shop_items` | Digital goods |
| `shop_bundles` | Bundle deals |
| `sticker_packs` | Sticker collections |
| `governance_proposals` | DAO proposals |
| `governance_votes` | Voting records |

---

## Testing

```bash
# Run type checking
npm run typecheck

# Run linting
npm run lint

# Run build
npm run build
```

---

## Deployment

The platform is deployed via Lovable with automatic:
- Frontend deployment on publish
- Edge function deployment on code changes
- Database migrations on approval

---

## Contributing

1. Follow the existing code patterns
2. Use semantic color tokens
3. Create focused, reusable components
4. Add proper TypeScript types
5. Write descriptive commit messages

---

## License

Proprietary - The Lily Pad © 2024
