import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/providers/WalletProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useSiteAsset } from "@/hooks/useSiteAsset";

const fallbackAuthBranding = "/auth-branding.webp";

// Phantom icon
const PhantomIcon = () => (
  <svg width="20" height="20" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="128" height="128" rx="26" fill="url(#paint0_linear)" />
    <path d="M110.5 64.6C110.5 90.5 89.3 111.5 63.2 111.5H33.6C31.5 111.5 29.8 109.8 29.8 107.7V63.1C29.8 41.1 47.9 23.2 70.1 23.2C92.3 23.2 110.5 41.1 110.5 63.1V64.6Z" fill="url(#paint1_linear)" />
    <path d="M86.7 64.5C86.7 68.3 83.6 71.4 79.8 71.4C76 71.4 72.9 68.3 72.9 64.5C72.9 60.7 76 57.6 79.8 57.6C83.6 57.6 86.7 60.7 86.7 64.5Z" fill="white" />
    <path d="M64.5 64.5C64.5 68.3 61.4 71.4 57.6 71.4C53.8 71.4 50.7 68.3 50.7 64.5C50.7 60.7 53.8 57.6 57.6 57.6C61.4 57.6 64.5 60.7 64.5 64.5Z" fill="white" />
    <defs>
      <linearGradient id="paint0_linear" x1="64" y1="0" x2="64" y2="128" gradientUnits="userSpaceOnUse">
        <stop stopColor="#534BB1" />
        <stop offset="1" stopColor="#551BF9" />
      </linearGradient>
      <linearGradient id="paint1_linear" x1="70.15" y1="23.2" x2="70.15" y2="111.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="white" />
        <stop offset="1" stopColor="white" stopOpacity="0.82" />
      </linearGradient>
    </defs>
  </svg>
);

export default function Auth() {
  const navigate = useNavigate();
  const { connect, isConnected, isConnecting, address } = useWallet();
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  // Fetch dynamic auth branding from site_assets, fallback to local
  const { assetUrl: authBranding } = useSiteAsset('auth_branding', fallbackAuthBranding);

  useSEO({
    title: "Connect Wallet | The Lily Pad",
    description: "Connect your Phantom wallet to access The Lily Pad. Manage your streams, launch NFT collections, and connect with the community."
  });

  // Redirect when connected
  useEffect(() => {
    if (isConnected && address) {
      navigate("/");
    }
  }, [isConnected, address, navigate]);

  const handlePhantomConnect = async () => {
    setIsConnectingWallet(true);
    try {
      await connect();
    } catch (error) {
      console.error("Phantom connect error:", error);
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const isLoading = isConnecting || isConnectingWallet;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Hero Image (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-emerald-50 to-emerald-100 items-center justify-center p-8">
        <img
          src={authBranding || fallbackAuthBranding}
          alt="The Lily Pad"
          className="w-full h-full object-contain"
          fetchPriority="high"
          loading="eager"
          decoding="async"
          width={1920}
          height={1080}
        />
      </div>

      {/* Right side - Wallet Connect */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 bg-background">
        {/* Mobile Branding */}
        <div className="lg:hidden mb-6 w-full max-w-[280px]">
          <img
            src={authBranding || fallbackAuthBranding}
            alt="The Lily Pad"
            className="w-full h-auto rounded-lg"
            fetchPriority="high"
            loading="eager"
            decoding="async"
            width={280}
            height={157}
          />
        </div>

        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Welcome to The Lily Pad</CardTitle>
            <CardDescription>Connect your Phantom wallet to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phantom Wallet Connect */}
            <Button
              onClick={handlePhantomConnect}
              disabled={isLoading}
              className="w-full h-14 text-base font-medium"
              variant="default"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-3" />
              ) : (
                <span className="mr-3"><PhantomIcon /></span>
              )}
              Connect with Phantom
            </Button>

            {/* Info text */}
            <p className="text-xs text-muted-foreground text-center pt-2">
              Phantom supports multiple sign-in options including Google, Apple, and passkeys directly within the wallet.
            </p>
          </CardContent>
        </Card>

        {/* Install Phantom link */}
        <p className="mt-6 text-sm text-muted-foreground text-center">
          Need Phantom?{" "}
          <a
            href="https://phantom.app/download"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Download here
          </a>
        </p>
      </div>
    </div>
  );
}
