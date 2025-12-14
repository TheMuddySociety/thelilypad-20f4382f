import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LilyPadLogo } from "@/components/LilyPadLogo";
import { Menu, X } from "lucide-react";
import { ConnectWallet } from "@/components/wallet/ConnectWallet";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const navLinks = [
  { label: "Marketplace", href: "#" },
  { label: "Launchpad", href: "#" },
  { label: "Streams", href: "/streams" },
  { label: "Raffles", href: "#" },
];

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
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

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
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
              <div className="p-4 space-y-2">
                {navLinks.map((link) => (
                  <DrawerClose asChild key={link.label}>
                    <a
                      href={link.href}
                      className="flex items-center px-4 py-3 rounded-lg text-foreground hover:bg-muted/50 transition-colors font-medium"
                    >
                      {link.label}
                    </a>
                  </DrawerClose>
                ))}
              </div>
              <div className="p-4 pt-0 space-y-3 border-t border-border/50 mt-2">
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
