import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Zap,
  Globe,
  Layers,
  Palette,
  Music,
  Image as ImageIcon,
  Shield,
  Rocket,
  Clock,
  Users,
} from "lucide-react";

interface LaunchpadNavigationProps {
  selectedChain: "solana" | "monad";
  onChainChange: (chain: "solana" | "monad") => void;
  onSelectStandard?: (standard: string) => void;
  className?: string;
}

// Solana-specific features and standards
const solanaFeatures = [
  {
    id: "core",
    title: "Metaplex Core",
    href: "#core",
    description: "Modern NFT standard with low gas costs (~0.005 SOL). Best for new collections.",
    icon: Sparkles,
  },
  {
    id: "candy-machine",
    title: "Candy Machine v3",
    href: "#candy-machine",
    description: "Fair launches with bot protection and advanced minting features (~0.02 SOL).",
    icon: Shield,
  },
  {
    id: "bubblegum",
    title: "Bubblegum (cNFT)",
    href: "#bubblegum",
    description: "Compressed NFTs for large 10k+ collections with minimal costs (~0.0001 SOL/NFT).",
    icon: Layers,
  },
  {
    id: "token-metadata",
    title: "Token Metadata",
    href: "#token-metadata",
    description: "Classic Metaplex standard with maximum marketplace compatibility (~0.01 SOL).",
    icon: Globe,
  },
];

// ... (Monad features unchanged for now, but good to keep consistency if needed) ...

export function LaunchpadNavigation({ selectedChain, onChainChange, onSelectStandard, className }: LaunchpadNavigationProps) {
  const location = useLocation();

  const handleStandardClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (onSelectStandard) {
      // Map ids to standards
      // 'candy-machine' defaults to 'core' here as per re-architecture goals, 
      // or we could open modal and let user choose. 
      // For now, map specific IDs to SolanaStandard values.
      let standard = 'core';
      if (id === 'token-metadata') standard = 'token-metadata';
      if (id === 'bubblegum') standard = 'bubblegum';
      if (id === 'core') standard = 'core';
      if (id === 'candy-machine') standard = 'core'; // Core CM is default now

      onSelectStandard(standard);
    }
  };

  return (
    <NavigationMenu className={cn("max-w-full w-full justify-start", className)}>
      <NavigationMenuList className="flex-wrap gap-1">
        {/* Solana Contracts Menu */}
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={cn(
              "gap-2",
              selectedChain === "solana" && "bg-primary/10 text-primary"
            )}
            onClick={() => onChainChange("solana")}
          >
            <Globe className="w-4 h-4" />
            Solana Contracts
            <Badge variant="secondary" className="ml-1 h-5 text-[10px] bg-green-500/20 text-green-500 border-green-500/30">
              Active
            </Badge>
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
              {solanaFeatures.map((feature) => (
                <ListItem
                  key={feature.title}
                  title={feature.title}
                  href={feature.href}
                  icon={feature.icon}
                  onClick={(e) => handleStandardClick(e, feature.id)}
                >
                  {feature.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* ... Monad and Collection Types ... (unchanged structure but ensuring closing tags line up) */}
        {/* Monad/EVM Contracts Menu */}
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={cn(
              "gap-2",
              selectedChain === "monad" && "bg-purple-500/10 text-purple-500"
            )}
            onClick={() => onChainChange("monad")}
          >
            <Zap className="w-4 h-4" />
            Monad Contracts
            <Badge variant="outline" className="ml-1 h-5 text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30">
              Coming Soon
            </Badge>
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
              <li className="row-span-3">
                <div className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-purple-500/20 to-purple-500/5 p-6 no-underline outline-none">
                  <Zap className="h-8 w-8 text-purple-500" />
                  <div className="mb-2 mt-4 text-lg font-medium text-purple-500">
                    Monad EVM
                  </div>
                  <p className="text-sm leading-tight text-muted-foreground">
                    High-performance EVM-compatible blockchain. Deploy Solidity smart contracts with familiar tools.
                  </p>
                  <Badge
                    variant="outline"
                    className="mt-4 w-fit bg-amber-500/10 text-amber-500 border-amber-500/30"
                  >
                    Coming Q2 2026
                  </Badge>
                </div>
              </li>
              {monadFeatures.map((feature) => (
                <ListItem
                  key={feature.title}
                  title={feature.title}
                  href={feature.href}
                  icon={feature.icon}
                  disabled={feature.comingSoon}
                >
                  {feature.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Collection Types Menu */}
        <NavigationMenuItem>
          <NavigationMenuTrigger className="gap-2">
            <Palette className="w-4 h-4" />
            Collection Types
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
              {collectionTypes.map((type) => (
                <ListItem
                  key={type.title}
                  title={type.title}
                  href={type.href}
                  icon={type.icon}
                >
                  {type.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Quick Links */}
        <NavigationMenuItem>
          <Link to="/marketplace">
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              <Rocket className="w-4 h-4 mr-2" />
              Marketplace
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

interface ListItemProps extends React.ComponentPropsWithoutRef<"a"> {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const ListItem = React.forwardRef<React.ElementRef<"a">, ListItemProps>(
  ({ className, title, children, icon: Icon, disabled, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <a
            ref={ref}
            className={cn(
              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors",
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              className
            )}
            {...props}
            onClick={disabled ? (e) => e.preventDefault() : props.onClick}
          >
            <div className="flex items-center gap-2">
              {Icon && <Icon className="w-4 h-4 text-primary" />}
              <div className="text-sm font-medium leading-none">{title}</div>
              {disabled && (
                <Badge variant="outline" className="h-4 text-[9px] px-1">
                  Soon
                </Badge>
              )}
            </div>
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
              {children}
            </p>
          </a>
        </NavigationMenuLink>
      </li>
    );
  }
);
ListItem.displayName = "ListItem";

export default LaunchpadNavigation;
