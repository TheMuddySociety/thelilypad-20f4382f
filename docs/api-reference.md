# API Reference

This document covers the APIs and hooks available in The Lily Pad.

## Wallet API

### useWallet Hook

```typescript
import { useWallet } from "@/providers/WalletProvider";

const {
  // State
  address,          // string | null
  isConnected,      // boolean
  isConnecting,     // boolean
  balance,          // string | null
  chainId,          // number | null
  network,          // "mainnet" | "testnet"
  currentChain,     // Chain object
  
  // Methods
  connect,          // () => Promise<void>
  disconnect,       // () => void
  switchToMonad,    // () => Promise<void>
  switchNetwork,    // (network: NetworkType) => void
  sendTransaction,  // (to: string, amount: string) => Promise<string | null>
} = useWallet();
```

### Chain Configuration

```typescript
import { 
  monadMainnet, 
  monadTestnet, 
  getMonadChain, 
  getAlchemyRpcUrl,
  NetworkType 
} from "@/config/alchemy";

// Get chain by network
const chain = getMonadChain("mainnet");

// Get RPC URL
const rpcUrl = getAlchemyRpcUrl("testnet");
```

## Components

### ConnectWallet

```tsx
import { ConnectWallet } from "@/components/wallet/ConnectWallet";

<ConnectWallet
  variant="default" | "ghost" | "outline"
  size="default" | "sm" | "lg" | "icon"
  className="optional-classes"
/>
```

### NetworkSwitch

```tsx
import { NetworkSwitch } from "@/components/wallet/NetworkSwitch";

<NetworkSwitch />
// Displays network toggle with faucet link on testnet
```

### TestnetBanner

```tsx
import { TestnetBanner } from "@/components/TestnetBanner";

<TestnetBanner />
// Renders banner only when on testnet
```

## Hooks

### useTestnetOffset

```typescript
import { useTestnetOffset } from "@/hooks/useTestnetOffset";

const {
  isTestnet,      // boolean
  bannerHeight,   // number (36 or 0)
  paddingClass,   // string ("pt-[36px]" or "")
  topOffset,      // number
} = useTestnetOffset();
```

### useMobile

```typescript
import { useIsMobile } from "@/hooks/use-mobile";

const isMobile = useIsMobile();
// Returns true if viewport width < 768px
```

## Supabase Client

```typescript
import { supabase } from "@/integrations/supabase/client";

// Query data
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value);

// Insert data
const { data, error } = await supabase
  .from('table_name')
  .insert({ column: value });

// Call edge function
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { key: value }
});
```

## Edge Functions

### Content Moderation

```typescript
// POST /functions/v1/content-moderation
const response = await supabase.functions.invoke('content-moderation', {
  body: {
    content_type: 'image',
    content_base64: base64String,
  }
});

// Response
interface ModerationResponse {
  is_safe: boolean;
  score: number;
  reasons: string[];
  details?: Record<string, number>;
}
```

### Alchemy RPC Proxy

```typescript
// POST /functions/v1/alchemy-rpc
const response = await supabase.functions.invoke('alchemy-rpc', {
  body: {
    network: 'monad-mainnet',
    method: 'eth_getBalance',
    params: [address, 'latest'],
  }
});
```

## UI Components (shadcn/ui)

### Button

```tsx
import { Button } from "@/components/ui/button";

<Button 
  variant="default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size="default" | "sm" | "lg" | "icon"
  disabled={boolean}
  onClick={handler}
>
  Click me
</Button>
```

### Card

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

### Badge

```tsx
import { Badge } from "@/components/ui/badge";

<Badge variant="default" | "secondary" | "destructive" | "outline">
  Label
</Badge>
```

### Toast

```typescript
import { toast } from "sonner";

// Success
toast.success("Title", { description: "Description" });

// Error
toast.error("Error", { description: "What went wrong" });

// With action
toast.error("Error", {
  description: "Description",
  action: {
    label: "Retry",
    onClick: () => handleRetry(),
  },
});
```

### Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

<Tabs defaultValue="tab1" onValueChange={handleChange}>
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### Input

```tsx
import { Input } from "@/components/ui/input";

<Input
  type="text" | "number" | "email" | "password"
  placeholder="Enter value"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  disabled={boolean}
/>
```

### Switch

```tsx
import { Switch } from "@/components/ui/switch";

<Switch
  checked={isChecked}
  onCheckedChange={setIsChecked}
  disabled={boolean}
/>
```

### Progress

```tsx
import { Progress } from "@/components/ui/progress";

<Progress value={75} className="w-full" />
```

### Separator

```tsx
import { Separator } from "@/components/ui/separator";

<Separator orientation="horizontal" | "vertical" />
```

## Utility Functions

### cn (Class Names)

```typescript
import { cn } from "@/lib/utils";

// Merge class names with conditional logic
<div className={cn(
  "base-class",
  isActive && "active-class",
  variant === "primary" && "primary-class"
)} />
```

## TypeScript Types

### Database Types

```typescript
import { Database } from "@/integrations/supabase/types";

type Tables = Database['public']['Tables'];
type AllowlistEntry = Tables['allowlist_entries']['Row'];
type ModerationStatus = Database['public']['Enums']['moderation_status'];
```

### Network Types

```typescript
import { NetworkType } from "@/config/alchemy";

type NetworkType = "mainnet" | "testnet";
```

## Error Handling

### Standard Pattern

```typescript
try {
  const result = await apiCall();
  // Handle success
} catch (error) {
  if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error("An unexpected error occurred");
  }
  console.error(error);
}
```

### Supabase Errors

```typescript
const { data, error } = await supabase.from('table').select();

if (error) {
  console.error('Supabase error:', error.message);
  toast.error("Database error");
  return;
}

// Use data safely
```
