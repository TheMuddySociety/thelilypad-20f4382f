import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LilyPadLogo } from "@/components/LilyPadLogo";
import { Menu, Users, Heart, LayoutDashboard, Gift, UserCog, Radio } from "lucide-react";
import { ConnectWallet } from "@/components/wallet/ConnectWallet";
import { NetworkSwitch } from "@/components/wallet/NetworkSwitch";
import { NotificationBell } from "@/components/NotificationBell";
import { useWallet } from "@/providers/WalletProvider";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

import type { LucideIcon } from "lucide-react";
import { Store, Rocket, Video } from "lucide-react";

const primaryLinks: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Marketplace", href: "/marketplace", icon: Store },
  { label: "Launchpad", href: "/launchpad", icon: Rocket },
  { label: "Streams", href: "/streams", icon: Video },
];

const exploreLinks = [
  { label: "Streamers", href: "/streamers", icon: Users },
  { label: "Following", href: "/following", icon: Heart },
];

const accountLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Donations", href: "/donor-profile", icon: Gift },
  { label: "Edit Profile", href: "/edit-profile", icon: UserCog },
  { label: "Go Live", href: "/go-live", icon: Radio },
];

const allMobileLinks = [
  ...primaryLinks,
  ...exploreLinks,
  ...accountLinks,
];

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { network } = useWallet();
  const isTestnet = network === "testnet";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
        isTestnet ? "top-[36px]" : "top-0"
      } ${
        isScrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <LilyPadLogo size={32} className="sm:w-9 sm:h-9" />
            <span className="font-bold text-base sm:text-lg hidden xs:block">The Lily Pad</span>
          </a>

          {/* Desktop nav with dropdowns */}
          <div className="hidden md:flex items-center">
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                {/* Primary Links */}
                {primaryLinks.map((link) => (
                  <NavigationMenuItem key={link.label}>
                    <NavigationMenuLink
                      href={link.href}
                      className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
                    >
                      {link.label}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}

                {/* Explore Dropdown */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm font-medium text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted/50 data-[state=open]:bg-muted/50">
                    Explore
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="w-48 p-2 bg-popover border border-border rounded-lg shadow-lg">
                      {exploreLinks.map((link) => (
                        <li key={link.label}>
                          <NavigationMenuLink
                            href={link.href}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                          >
                            <link.icon className="w-4 h-4 text-muted-foreground" />
                            {link.label}
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Account Dropdown */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm font-medium text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted/50 data-[state=open]:bg-muted/50">
                    Account
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="w-48 p-2 bg-popover border border-border rounded-lg shadow-lg">
                      {accountLinks.map((link) => (
                        <li key={link.label}>
                          <NavigationMenuLink
                            href={link.href}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                          >
                            <link.icon className="w-4 h-4 text-muted-foreground" />
                            {link.label}
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <NetworkSwitch />
            <NotificationBell />
            <ConnectWallet />
            <Button variant="default" size="sm">
              Launch
            </Button>
          </div>

          {/* Mobile menu drawer */}
          <Drawer>
            <DrawerTrigger asChild className="md:hidden">
              <button className="p-2 hover:bg-muted/50 rounded-lg transition-colors">
                <Menu className="w-5 h-5" />
              </button>
            </DrawerTrigger>
            <DrawerContent className="bg-background">
              <DrawerHeader className="border-b border-border/50">
                <DrawerTitle className="flex items-center gap-2">
                  <LilyPadLogo size={28} />
                  <span>The Lily Pad</span>
                </DrawerTitle>
              </DrawerHeader>
              <div className="p-4 space-y-4">
                {/* Primary Links */}
                <div className="space-y-1">
                  {primaryLinks.map((link) => (
                    <DrawerClose asChild key={link.label}>
                      <a
                        href={link.href}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-muted/50 transition-colors font-medium"
                      >
                        <link.icon className="w-5 h-5 text-muted-foreground" />
                        {link.label}
                      </a>
                    </DrawerClose>
                  ))}
                </div>

                {/* Explore Section */}
                <div className="space-y-1">
                  <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Explore</p>
                  {exploreLinks.map((link) => (
                    <DrawerClose asChild key={link.label}>
                      <a
                        href={link.href}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-muted/50 transition-colors font-medium"
                      >
                        <link.icon className="w-5 h-5 text-muted-foreground" />
                        {link.label}
                      </a>
                    </DrawerClose>
                  ))}
                </div>

                {/* Account Section */}
                <div className="space-y-1">
                  <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</p>
                  {accountLinks.map((link) => (
                    <DrawerClose asChild key={link.label}>
                      <a
                        href={link.href}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-muted/50 transition-colors font-medium"
                      >
                        <link.icon className="w-5 h-5 text-muted-foreground" />
                        {link.label}
                      </a>
                    </DrawerClose>
                  ))}
                </div>
              </div>
              <div className="p-4 pt-0 space-y-3 border-t border-border/50 mt-2">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <NetworkSwitch />
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <NotificationBell />
                  <span className="text-sm text-muted-foreground">Live Notifications</span>
                </div>
                <ConnectWallet className="w-full justify-center" />
                <Button variant="default" size="default" className="w-full">
                  Launch
                </Button>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </nav>
  );
};