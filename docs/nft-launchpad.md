# NFT Launchpad

The Lily Pad Launchpad enables creators to launch NFT collections on the Monad blockchain with multi-phase minting support.

## Overview

The launchpad provides:
- Collection creation with customizable traits
- Multi-phase minting (Team, Partners, Allowlist, Public)
- Allowlist management
- Real-time supply tracking
- Content moderation for images

## Launchpad Page

Navigate to `/launchpad` to see:

- **Stats**: Total collections, live mints, NFTs minted, volume
- **Filters**: All, Live, Upcoming, Ended
- **Collection Cards**: Preview of each collection

## Collection States

| Status | Description |
|--------|-------------|
| **Live** | Currently minting |
| **Upcoming** | Scheduled to start |
| **Ended** | Minting complete or sold out |

## Creating a Collection

### Step 1: Basic Information

```typescript
{
  name: "My Collection",
  symbol: "MYCOL",
  description: "A unique NFT collection...",
  totalSupply: 10000,
  royaltyPercent: 5,
}
```

### Step 2: Configure Phases

Each collection can have multiple mint phases:

```typescript
phases: [
  {
    name: "Team Mint",
    price: "0",           // Free
    maxPerWallet: 10,
    supply: 100,
    requiresAllowlist: false,
    startTime: new Date("2024-01-01"),
    endTime: new Date("2024-01-02"),
  },
  {
    name: "Allowlist",
    price: "0.25",
    maxPerWallet: 3,
    supply: 1000,
    requiresAllowlist: true,
    startTime: new Date("2024-01-03"),
    endTime: new Date("2024-01-04"),
  },
  {
    name: "Public Mint",
    price: "0.5",
    maxPerWallet: 5,
    supply: 8900,
    requiresAllowlist: false,
    startTime: new Date("2024-01-05"),
    endTime: null,  // Open-ended
  },
]
```

### Step 3: Upload Artwork

Use the Bulk Trait Uploader to upload layer images:

1. Create layers (Background, Body, Eyes, etc.)
2. Upload trait images for each layer
3. Set rarity weights
4. Configure trait rules

### Step 4: Set Up Allowlist

For allowlist phases:

1. Navigate to Allowlist Manager
2. Upload CSV or add addresses manually
3. Set max mint per address
4. Assign to specific phases

## Collection Detail Page

The detail page (`/launchpad/:collectionId`) shows:

### Left Column
- Collection header with image and status
- Description and metadata
- Phase progress breakdown

### Right Column
- Live supply tracker
- Mint card with phase selection
- Wallet balance display
- Gas estimation
- Mint button

## Mint Phases

### Phase Types

| Phase | Purpose | Typical Price |
|-------|---------|---------------|
| **Team** | Reserve for team | Free |
| **Partners** | Collaborators, advisors | Free/Discounted |
| **Allowlist** | Early supporters | Discounted |
| **Public** | Open to all | Full price |

### Phase Flow

```
Team → Partners → Allowlist → Public
  ↓        ↓          ↓          ↓
Free    Free     Discounted   Full Price
```

## Allowlist Management

### Adding Addresses

```typescript
// Single address
{
  wallet_address: "0x1234...",
  phase_name: "allowlist",
  max_mint: 3,
  notes: "Discord OG"
}

// Bulk import via CSV
wallet_address,phase_name,max_mint,notes
0x1234...,allowlist,3,Discord OG
0x5678...,allowlist,2,Twitter winner
```

### Verification

During minting, the platform checks:
1. Is the address on the allowlist?
2. What's the max mint for this address?
3. How many has this address already minted?

## Content Moderation

All trait images are scanned for:
- NSFW content
- Violence
- Hate speech
- Spam

### Moderation Flow

```
Upload Image → AI Scan → Auto-Approve/Reject → Manual Review (if needed)
```

### Scan Caching

- Approved images are cached by hash
- Re-uploads skip scanning if already approved
- Clear cache option available

## Real-Time Supply

The detail page shows live supply updates:

```typescript
// Updates every 3 seconds
useEffect(() => {
  const interval = setInterval(() => {
    refreshSupply();
  }, 3000);
  return () => clearInterval(interval);
}, []);
```

## Network Badge

Each collection displays its network:

- 🌐 **Mainnet**: Real MON, permanent
- 🧪 **Testnet**: Test MON, for testing

## Creating Collections

### Using the Modal

1. Click **Create Collection** button
2. Fill in collection details
3. Configure mint phases
4. Upload artwork
5. Deploy contract

### Contract Deployment

When creating a collection:
1. Metadata is validated
2. Contract bytecode is generated
3. User signs deployment transaction
4. Contract is deployed to Monad
5. Collection appears on launchpad

## Best Practices

### For Creators

- ✅ Test on testnet first
- ✅ Set reasonable max per wallet limits
- ✅ Use multiple phases for fair distribution
- ✅ Prepare high-quality artwork
- ✅ Engage community before launch

### For Collectors

- ✅ Verify contract address
- ✅ Check phase requirements
- ✅ Monitor gas prices
- ✅ Ensure sufficient balance
- ✅ Join allowlists early
