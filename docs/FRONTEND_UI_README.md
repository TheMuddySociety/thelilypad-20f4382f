# The Lily Pad - Frontend UI Developer Guide

A comprehensive guide to the frontend UI components, design system, and features for developers.

## 🎨 Design System

### Color Tokens

All colors use HSL format and are defined as CSS variables in `src/index.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 262 80% 60%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --muted: 210 40% 96%;
  --accent: 210 40% 96%;
  --destructive: 0 84% 60%;
  --border: 214.3 31.8% 91.4%;
  --ring: 262 80% 60%;
}
```

### Usage in Components

```tsx
// ✅ Correct - using semantic tokens
<div className="bg-background text-foreground border-border" />
<Button className="bg-primary text-primary-foreground" />

// ❌ Incorrect - hardcoded colors
<div className="bg-white text-black" />
```

### Tailwind Config

Extended theme values in `tailwind.config.ts`:

```typescript
colors: {
  border: "hsl(var(--border))",
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  primary: {
    DEFAULT: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
  },
  // ... more semantic tokens
}
```

---

## 🧩 Component Library

### Base UI Components (`src/components/ui/`)

Built on shadcn/ui with Radix primitives:

| Component | Path | Description |
|-----------|------|-------------|
| `Button` | `ui/button.tsx` | Primary action element with variants |
| `Card` | `ui/card.tsx` | Container with header, content, footer |
| `Dialog` | `ui/dialog.tsx` | Modal dialogs |
| `Sheet` | `ui/sheet.tsx` | Slide-out panels |
| `Tabs` | `ui/tabs.tsx` | Tab navigation |
| `Toast` | `ui/toast.tsx` | Notification toasts |
| `Skeleton` | `ui/skeleton.tsx` | Loading placeholders |
| `Badge` | `ui/badge.tsx` | Status indicators |
| `Progress` | `ui/progress.tsx` | Progress bars |

### Button Variants

```tsx
import { Button } from "@/components/ui/button";

<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

### Card Structure

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

---

## 🔌 Feature Components

### Wallet Components (`src/components/wallet/`)

| Component | Purpose |
|-----------|---------|
| `ConnectWallet` | Wallet connection button with states |
| `NetworkSwitch` | Mainnet/Testnet toggle |
| `WalletSelectorModal` | Multi-wallet selection |
| `NFTFilters` | Filter controls for NFT views |
| `PortfolioValueCard` | Portfolio value display |

### Launchpad Components (`src/components/launchpad/`)

| Component | Purpose |
|-----------|---------|
| `CreateCollectionModal` | Multi-step collection creation |
| `LayerManager` | Generative art layer management |
| `TraitRulesManager` | Trait compatibility rules |
| `GenerationPreview` | NFT preview generator |
| `ArtworkUploader` | 1-of-1 artwork uploads |
| `PhaseConfigManager` | Mint phase configuration |
| `AllowlistManager` | Whitelist management |
| `LaunchChecklist` | Pre-launch checklist |

### Streaming Components (`src/components/streaming/`)

| Component | Purpose |
|-----------|---------|
| `BrowserStreamPreview` | Live stream preview |
| `StreamControls` | Streaming control panel |
| `WebRTCViewer` | Stream viewer component |
| `PipOverlay` | Picture-in-picture overlay |

### Common Components (`src/components/common/`)

```tsx
import { PageHeader, EmptyState, StatsGrid, SectionError } from "@/components/common";

<PageHeader 
  title="My Collections" 
  description="Manage your NFT collections"
  actions={<Button>Create</Button>}
/>

<EmptyState 
  icon={<Inbox />}
  title="No items yet"
  description="Create your first item"
  action={<Button>Get Started</Button>}
/>

<StatsGrid stats={[
  { label: "Total", value: "1,234" },
  { label: "Active", value: "56" },
]} />
```

---

## 📄 Page Structure

### Layout Pattern

```tsx
// Standard page layout
const MyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <PageHeader title="Page Title" />
        {/* Page content */}
      </main>
    </div>
  );
};
```

### Key Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Index` | Landing page with hero & features |
| `/launchpad` | `Launchpad` | NFT collection management |
| `/marketplace` | `Marketplace` | NFT marketplace browsing |
| `/streams` | `Streams` | Live streams directory |
| `/dashboard` | `Dashboard` | Creator dashboard |
| `/collection/:id` | `CollectionDetail` | Collection details & minting |

---

## 🎬 Animations

### Framer Motion Usage

```tsx
import { motion } from "framer-motion";

// Fade in on mount
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>

// Stagger children
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
>
  {items.map(item => (
    <motion.div
      key={item.id}
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
      }}
    >
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

### Animation Presets

```tsx
// Common animation configs
const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { type: "spring", stiffness: 300, damping: 24 },
};
```

---

## 🪝 UI Hooks

### Display & Responsive

```tsx
import { useIsMobile } from "@/hooks/use-mobile";

const MyComponent = () => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileView /> : <DesktopView />;
};
```

### Toast Notifications

```tsx
import { toast } from "sonner";

// Success
toast.success("Action completed!");

// Error
toast.error("Something went wrong");

// Loading with ID for updates
toast.loading("Processing...", { id: "action" });
toast.success("Done!", { id: "action" });

// Custom
toast("Custom message", {
  description: "Additional details",
  action: {
    label: "Undo",
    onClick: () => handleUndo(),
  },
});
```

### SEO Hook

```tsx
import { useSEO } from "@/hooks/useSEO";

const MyPage = () => {
  useSEO({
    title: "Page Title | The Lily Pad",
    description: "Page description for search engines",
  });
  
  return <div>...</div>;
};
```

---

## 📱 Responsive Design

### Breakpoints

```css
/* Tailwind default breakpoints */
sm: 640px   /* Small devices */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Responsive Patterns

```tsx
// Grid columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>

// Flex to grid
<div className="flex flex-col md:flex-row gap-4">
  <Sidebar className="w-full md:w-64" />
  <Content className="flex-1" />
</div>

// Hide/show
<div className="hidden md:block">Desktop only</div>
<div className="block md:hidden">Mobile only</div>
```

---

## 🌙 Dark Mode

Powered by `next-themes`:

```tsx
import { useTheme } from "next-themes";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      Toggle Theme
    </Button>
  );
};
```

All components use semantic color tokens that automatically adapt to dark mode.

---

## 🔄 Loading States

### Skeleton Pattern

```tsx
import { Skeleton } from "@/components/ui/skeleton";

// Card skeleton
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-48" />
    <Skeleton className="h-4 w-32" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-32 w-full" />
  </CardContent>
</Card>

// List skeleton
{Array.from({ length: 5 }).map((_, i) => (
  <Skeleton key={i} className="h-16 w-full" />
))}
```

### Loading Spinner

```tsx
import FrogLoader from "@/components/FrogLoader";

<FrogLoader size="sm" /> // 32px
<FrogLoader size="md" /> // 48px
<FrogLoader size="lg" /> // 64px
```

---

## ⚠️ Error Handling

### Error Boundary

```tsx
import ErrorBoundary from "@/components/ErrorBoundary";

<ErrorBoundary fallback={<ErrorFallback />}>
  <RiskyComponent />
</ErrorBoundary>
```

### Section Error

```tsx
import { SectionError } from "@/components/common";

<SectionError
  title="Failed to load data"
  message="Please try again later"
  onRetry={() => refetch()}
/>
```

---

## 📦 Icons

Using `lucide-react`:

```tsx
import { Wallet, RefreshCw, AlertTriangle, Check, X } from "lucide-react";

<Wallet className="h-5 w-5" />
<RefreshCw className="h-4 w-4 animate-spin" />
```

Common icons used throughout:
- Navigation: `Home`, `Settings`, `User`, `Menu`
- Actions: `Plus`, `Edit`, `Trash`, `Download`, `Upload`
- Status: `Check`, `X`, `AlertTriangle`, `Info`
- Media: `Play`, `Pause`, `Volume`, `Image`
- Blockchain: `Wallet`, `Coins`, `ArrowUpRight`

---

## 🚀 Performance Tips

### Code Splitting

```tsx
import { lazy, Suspense } from "react";

const HeavyComponent = lazy(() => import("./HeavyComponent"));

<Suspense fallback={<Skeleton className="h-64 w-full" />}>
  <HeavyComponent />
</Suspense>
```

### Image Optimization

```tsx
// Use WebP format when possible
<img 
  src="/images/hero.webp" 
  alt="Hero"
  loading="lazy"
  className="w-full h-auto"
/>

// Responsive images
<picture>
  <source media="(max-width: 768px)" srcSet="/images/hero-mobile.webp" />
  <img src="/images/hero.webp" alt="Hero" />
</picture>
```

### Memoization

```tsx
import { memo, useMemo, useCallback } from "react";

// Memoize expensive components
const ExpensiveList = memo(({ items }) => {
  // ...
});

// Memoize computed values
const sortedItems = useMemo(() => 
  items.sort((a, b) => b.date - a.date), 
  [items]
);

// Memoize callbacks
const handleClick = useCallback((id) => {
  // ...
}, [dependency]);
```

---

## 📁 File Structure

```
src/
├── components/
│   ├── ui/              # Base shadcn/ui components
│   ├── common/          # Shared utility components
│   ├── wallet/          # Wallet-related components
│   ├── launchpad/       # NFT launchpad components
│   ├── streaming/       # Live streaming components
│   ├── marketplace/     # Marketplace components
│   ├── music/           # Music NFT components
│   ├── governance/      # DAO governance components
│   ├── sections/        # Landing page sections
│   └── admin/           # Admin panel components
├── hooks/               # Custom React hooks
├── pages/               # Route page components
├── providers/           # React context providers
├── lib/                 # Utility functions
├── config/              # App configuration
└── assets/              # Static assets
```

---

## ✅ Component Checklist

When creating new components:

- [ ] Use semantic color tokens from design system
- [ ] Support dark mode via CSS variables
- [ ] Include loading/skeleton state
- [ ] Handle error states gracefully
- [ ] Add proper TypeScript types
- [ ] Use `cn()` for conditional classes
- [ ] Include responsive styles
- [ ] Add entrance animations where appropriate
- [ ] Document props with JSDoc comments
