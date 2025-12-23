# Architecture Overview

This document outlines the technical architecture of The Lily Pad platform.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State Management | React Context, TanStack Query |
| Backend | Supabase (PostgreSQL, Edge Functions) |
| Blockchain | Monad (EVM-compatible) |
| Web3 | viem, MetaMask |

## Project Structure

```
src/
├── assets/              # Static assets (images, logos)
├── components/
│   ├── launchpad/       # NFT launchpad components
│   ├── sections/        # Landing page sections
│   ├── ui/              # shadcn/ui components
│   └── wallet/          # Wallet-related components
├── config/
│   └── alchemy.ts       # Chain configurations
├── hooks/               # Custom React hooks
├── integrations/
│   └── supabase/        # Supabase client & types
├── lib/
│   └── utils.ts         # Utility functions
├── pages/               # Route pages
├── providers/
│   └── WalletProvider.tsx  # Wallet context
└── types/               # TypeScript definitions

supabase/
├── config.toml          # Supabase configuration
└── functions/           # Edge functions
    ├── alchemy-rpc/     # RPC proxy
    └── content-moderation/  # AI moderation

docs/                    # Documentation
```

## Component Architecture

### Provider Hierarchy

```tsx
<QueryClientProvider>
  <WalletProvider>
    <TooltipProvider>
      <TestnetBanner />
      <Toaster />
      <BrowserRouter>
        <Routes />
      </BrowserRouter>
    </TooltipProvider>
  </WalletProvider>
</QueryClientProvider>
```

### Key Components

```
App.tsx
├── WalletProvider (global wallet state)
├── TestnetBanner (network indicator)
└── Routes
    ├── Index (landing page)
    ├── Launchpad (collection browser)
    ├── CollectionDetail (mint page)
    └── ... other pages
```

## State Management

### Wallet State (Context)

```typescript
interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string | null;
  chainId: number | null;
  network: NetworkType;
}
```

### Server State (TanStack Query)

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['collections'],
  queryFn: fetchCollections,
});
```

### Local State (useState)

```typescript
const [mintAmount, setMintAmount] = useState(1);
const [activePhase, setActivePhase] = useState(phases[0]);
```

## Data Flow

### Wallet Connection

```
User Click → connect() → MetaMask Popup → Approve
     ↓
Update State → Fetch Balance → Update UI
```

### Minting Flow

```
Select Amount → Estimate Gas → Check Balance
       ↓
Click Mint → MetaMask Sign → Transaction
       ↓
Wait Confirmation → Update Supply → Show Success
```

## API Architecture

### Supabase Edge Functions

```typescript
// supabase/functions/content-moderation/index.ts
serve(async (req) => {
  // Handle moderation requests
  const { image } = await req.json();
  const result = await moderateContent(image);
  return new Response(JSON.stringify(result));
});
```

### RPC Proxy

```typescript
// supabase/functions/alchemy-rpc/index.ts
serve(async (req) => {
  // Proxy RPC requests with API key
  const response = await fetch(alchemyUrl, {
    method: 'POST',
    body: JSON.stringify(rpcRequest),
  });
  return new Response(response.body);
});
```

## Database Schema

### Core Tables

```sql
-- Collections
CREATE TABLE collections (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT,
  description TEXT,
  total_supply INTEGER,
  contract_address TEXT,
  creator_address TEXT,
  network TEXT,
  created_at TIMESTAMP
);

-- Allowlist
CREATE TABLE allowlist_entries (
  id UUID PRIMARY KEY,
  collection_id UUID REFERENCES collections,
  wallet_address TEXT,
  phase_name TEXT,
  max_mint INTEGER,
  created_at TIMESTAMP
);
```

## Security

### Row Level Security

```sql
-- Only collection creator can modify
CREATE POLICY "Creator can update"
ON collections FOR UPDATE
USING (creator_address = auth.jwt()->>'address');
```

### API Key Protection

```typescript
// Never exposed to client
const ALCHEMY_API_KEY = Deno.env.get('ALCHEMY_API_KEY');
```

## Network Configuration

### Chain Definitions

```typescript
// src/config/alchemy.ts
export const monadMainnet = defineChain({
  id: 10143,
  name: "Monad Mainnet",
  // ...
});

export const monadTestnet = defineChain({
  id: 10144,
  name: "Monad Testnet",
  // ...
});
```

### Dynamic Chain Selection

```typescript
export const getMonadChain = (network: NetworkType) => 
  network === "mainnet" ? monadMainnet : monadTestnet;
```

## Performance Optimizations

### Code Splitting

```typescript
// Lazy load routes
const Launchpad = lazy(() => import('./pages/Launchpad'));
```

### Query Caching

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});
```

### Image Optimization

- WebP format for assets
- Lazy loading for off-screen images
- Responsive image sizes

## Error Handling

### Global Error Boundary

```tsx
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>
```

### API Error Handling

```typescript
try {
  const result = await apiCall();
} catch (error) {
  toast.error("Something went wrong");
  console.error(error);
}
```

## Testing Strategy

### Unit Tests
- Component rendering
- Hook behavior
- Utility functions

### Integration Tests
- Wallet connection flow
- Minting process
- Network switching

### E2E Tests
- Full user journeys
- Cross-browser testing

## Deployment

### Frontend
- Built with Vite
- Deployed to Lovable hosting
- CDN-distributed

### Backend
- Supabase Edge Functions
- Auto-deployed on push
- Globally distributed

## Monitoring

### Error Tracking
- Console logging
- Toast notifications
- Error boundaries

### Performance
- React Query devtools
- Network request logging
- Transaction monitoring
