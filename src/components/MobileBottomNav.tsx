import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Store, Rocket, Radio, User } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWallet } from "@/providers/WalletProvider";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Store, label: "Market", href: "/marketplace" },
  { icon: Rocket, label: "Launch", href: "/launchpad" },
  { icon: Radio, label: "Streams", href: "/streams" },
  { icon: User, label: "Profile", href: "/edit-profile" },
];

export const MobileBottomNav: React.FC = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { isConnected } = useWallet();

  // Only show on mobile
  if (!isMobile) return null;

  // Don't show on auth page
  if (location.pathname === "/auth") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          // For profile, redirect to auth if not connected
          const href = item.href === "/edit-profile" && !isConnected 
            ? "/auth" 
            : item.href;

          return (
            <Link
              key={item.href}
              to={href}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 mb-1 transition-transform",
                isActive && "scale-110"
              )} />
              <span className="text-xs font-medium truncate">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
