# Component Library

This document provides an overview of the key components in The Lily Pad.

## Wallet Components

### ConnectWallet

Main wallet connection button with dropdown menu.

```tsx
import { ConnectWallet } from "@/components/wallet/ConnectWallet";

// Basic usage
<ConnectWallet />

// With props
<ConnectWallet 
  variant="default"
  size="sm"
  className="w-full"
/>
```

**States:**
- Disconnected: Shows "Connect Wallet" button
- Connecting: Shows loading state
- Wrong Network: Shows "Switch to [Network]" button
- Connected: Shows address dropdown with options

### NetworkSwitch

Toggle between mainnet and testnet.

```tsx
import { NetworkSwitch } from "@/components/wallet/NetworkSwitch";

<NetworkSwitch />
```

**Features:**
- Network badge (Mainnet/Testnet)
- Toggle switch
- Faucet link (testnet only)
- Disabled when wallet connected

### TestnetBanner

Global testnet indicator banner.

```tsx
import { TestnetBanner } from "@/components/TestnetBanner";

<TestnetBanner />
// Renders only when network === "testnet"
```

## Launchpad Components

### CreateCollectionModal

Modal for creating new NFT collections.

```tsx
import { CreateCollectionModal } from "@/components/launchpad/CreateCollectionModal";

<CreateCollectionModal
  open={isOpen}
  onOpenChange={setIsOpen}
/>
```

### BulkTraitUploader

Upload and moderate trait images.

```tsx
import { BulkTraitUploader } from "@/components/launchpad/BulkTraitUploader";

<BulkTraitUploader
  onFilesProcessed={(files) => handleFiles(files)}
  layerId="background"
/>
```

**Features:**
- Drag and drop upload
- Concurrent scanning (1-10)
- Scan caching
- Progress tracking

### LayerManager

Manage collection layers and traits.

```tsx
import { LayerManager } from "@/components/launchpad/LayerManager";

<LayerManager
  layers={layers}
  onLayersChange={setLayers}
/>
```

### AllowlistManager

Manage allowlist entries.

```tsx
import { AllowlistManager } from "@/components/launchpad/AllowlistManager";

<AllowlistManager
  collectionId={collectionId}
  phases={phases}
/>
```

## Navigation Components

### Navbar

Main navigation bar.

```tsx
import { Navbar } from "@/components/Navbar";

<Navbar />
```

**Features:**
- Logo and branding
- Navigation links
- Network switch
- Wallet connection
- Mobile drawer

### NavLink

Styled navigation link.

```tsx
import { NavLink } from "@/components/NavLink";

<NavLink href="/launchpad" icon={Rocket}>
  Launchpad
</NavLink>
```

## UI Components (shadcn/ui)

### Button

```tsx
import { Button } from "@/components/ui/button";

// Variants
<Button variant="default">Default</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

### Card

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Badge

```tsx
import { Badge } from "@/components/ui/badge";

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>

// Custom styling
<Badge className="bg-green-500/20 text-green-400 border-green-500/30">
  Live
</Badge>
```

### Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

<Tabs defaultValue="all">
  <TabsList>
    <TabsTrigger value="all">All</TabsTrigger>
    <TabsTrigger value="live">Live</TabsTrigger>
    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
  </TabsList>
  <TabsContent value="all">All content</TabsContent>
  <TabsContent value="live">Live content</TabsContent>
  <TabsContent value="upcoming">Upcoming content</TabsContent>
</Tabs>
```

### Progress

```tsx
import { Progress } from "@/components/ui/progress";

<Progress value={75} className="h-2" />
```

### Input

```tsx
import { Input } from "@/components/ui/input";

<Input
  type="number"
  value={amount}
  onChange={(e) => setAmount(e.target.value)}
  placeholder="Enter amount"
  min={1}
  max={10}
/>
```

### Switch

```tsx
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

<div className="flex items-center gap-2">
  <Switch
    checked={enabled}
    onCheckedChange={setEnabled}
    id="toggle"
  />
  <Label htmlFor="toggle">Enable feature</Label>
</div>
```

### Slider

```tsx
import { Slider } from "@/components/ui/slider";

<Slider
  value={[value]}
  onValueChange={([v]) => setValue(v)}
  min={1}
  max={10}
  step={1}
/>
```

### Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog description</DialogDescription>
    </DialogHeader>
    <div>Dialog content</div>
  </DialogContent>
</Dialog>
```

### DropdownMenu

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Item 1</DropdownMenuItem>
    <DropdownMenuItem>Item 2</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Item 3</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Separator

```tsx
import { Separator } from "@/components/ui/separator";

<Separator className="my-4" />
```

### Tooltip

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>
      <p>Tooltip content</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## Icons (Lucide)

```tsx
import { 
  Wallet, 
  RefreshCw, 
  AlertTriangle, 
  Check, 
  Copy,
  FlaskConical,
  Globe,
  Fuel,
  Droplets,
} from "lucide-react";

<Wallet className="w-4 h-4" />
<RefreshCw className="w-4 h-4 animate-spin" />
```

## Custom Components

### FrogLoader

Loading animation component.

```tsx
import { FrogLoader } from "@/components/FrogLoader";

<FrogLoader />
```

### LilyPadLogo

Brand logo component.

```tsx
import { LilyPadLogo } from "@/components/LilyPadLogo";

<LilyPadLogo size={32} className="text-primary" />
```

## Component Patterns

### Conditional Rendering

```tsx
{isConnected && (
  <WalletInfo address={address} balance={balance} />
)}

{isWrongNetwork ? (
  <SwitchNetworkButton />
) : (
  <MintButton />
)}
```

### Loading States

```tsx
{isLoading ? (
  <div className="flex items-center gap-2">
    <Loader2 className="w-4 h-4 animate-spin" />
    <span>Loading...</span>
  </div>
) : (
  <Content />
)}
```

### Error States

```tsx
{error && (
  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
    <div className="flex items-center gap-2 text-destructive">
      <AlertTriangle className="w-4 h-4" />
      <span>{error.message}</span>
    </div>
  </div>
)}
```
