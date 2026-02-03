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
} from "lucide-react";
import { ChainSelector } from "./ChainSelector";
import { SupportedChain, CHAINS } from "@/config/chains";

interface LaunchpadNavigationProps {
  selectedChain: SupportedChain;
  onChainChange: (chain: SupportedChain) => void;
  onSelectStandard?: (standard: string) => void;
  className?: string;
}

// Solana-specific features and standards
const solanaFeatures = [
  {
    id: "core",
    title: "Metaplex Core",
    href: "#core",
    description: "Modern high-performance NFT standard with ultra-low gas costs (~0.005 SOL).",
    icon: Sparkles,
  },
  {
    id: "candy-machine",
    title: "Candy Machine",
    href: "#candy-machine",
    description: "Fair launch system with bot protection and multi-phase minting capabilities.",
    icon: Shield,
  },
];



// Collection types available
const collectionTypes = [
  {
    title: "Generative Art",
    href: "#generative",
    description: "Layer-based procedural generation for unique combinations.",
    icon: Palette,
  },
  {
    title: "Music NFTs",
    href: "#music",
    description: "Audio tracks with artwork and streaming capabilities.",
    icon: Music,
  },
];

export function LaunchpadNavigation({ selectedChain, onChainChange, onSelectStandard, className }: LaunchpadNavigationProps) {
  const location = useLocation();
  const currentChain = CHAINS[selectedChain];

  const handleStandardClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (onSelectStandard) {
      onSelectStandard('core');
    }
  };

  return (
    <div className={cn("w-full bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg", className)}>
      <NavigationMenu className="max-w-full w-full">
        <NavigationMenuList className="flex flex-wrap gap-2 justify-start w-full">
          {/* Chain Selector */}
          <NavigationMenuItem>
            <ChainSelector
              selectedChain={selectedChain}
              onChainChange={onChainChange}
            />
          </NavigationMenuItem>
          {/* Solana Contracts Menu */}
          <NavigationMenuItem>
            <NavigationMenuTrigger
              className={cn(
                "gap-2 h-10 px-4 text-sm font-medium",
                "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              onClick={() => { }}
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Launch Services</span>
              <span className="sm:hidden">Launch</span>
              <Badge variant="secondary" className="ml-1 h-5 text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                Active
              </Badge>
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[350px] gap-3 p-4 sm:w-[450px] md:w-[550px] md:grid-cols-2 bg-popover border border-border rounded-md shadow-xl z-50">
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



          {/* Collection Types Menu */}
          <NavigationMenuItem>
            <NavigationMenuTrigger className="gap-2 h-10 px-4 text-sm font-medium bg-secondary hover:bg-secondary/80">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Collection Types</span>
              <span className="sm:hidden">Types</span>
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[350px] gap-3 p-4 sm:w-[400px] md:grid-cols-2 bg-popover border border-border rounded-md shadow-xl z-50">
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
                <ListItem
                  title="Launch 1/1s & Editions"
                  href="/raffles"
                  icon={ImageIcon}
                >
                  Create single artworks and limited editions in the Raffles studio.
                </ListItem>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Quick Links */}
          <NavigationMenuItem>
            <Link to="/marketplace">
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), "h-10 px-4 bg-secondary hover:bg-secondary/80")}>
                <Rocket className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Marketplace</span>
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
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
