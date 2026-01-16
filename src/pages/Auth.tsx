import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/providers/WalletProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Wallet, Chrome } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import authBranding from "@/assets/auth-branding.png";

// Phantom and OAuth icons
const PhantomIcon = () => (
  <svg width="20" height="20" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="128" height="128" rx="26" fill="url(#paint0_linear)"/>
    <path d="M110.5 64.6C110.5 90.5 89.3 111.5 63.2 111.5H33.6C31.5 111.5 29.8 109.8 29.8 107.7V63.1C29.8 41.1 47.9 23.2 70.1 23.2C92.3 23.2 110.5 41.1 110.5 63.1V64.6Z" fill="url(#paint1_linear)"/>
    <path d="M86.7 64.5C86.7 68.3 83.6 71.4 79.8 71.4C76 71.4 72.9 68.3 72.9 64.5C72.9 60.7 76 57.6 79.8 57.6C83.6 57.6 86.7 60.7 86.7 64.5Z" fill="white"/>
    <path d="M64.5 64.5C64.5 68.3 61.4 71.4 57.6 71.4C53.8 71.4 50.7 68.3 50.7 64.5C50.7 60.7 53.8 57.6 57.6 57.6C61.4 57.6 64.5 60.7 64.5 64.5Z" fill="white"/>
    <defs>
      <linearGradient id="paint0_linear" x1="64" y1="0" x2="64" y2="128" gradientUnits="userSpaceOnUse">
        <stop stopColor="#534BB1"/>
        <stop offset="1" stopColor="#551BF9"/>
      </linearGradient>
      <linearGradient id="paint1_linear" x1="70.15" y1="23.2" x2="70.15" y2="111.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="white"/>
        <stop offset="1" stopColor="white" stopOpacity="0.82"/>
      </linearGradient>
    </defs>
  </svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

export default function Auth() {
  const navigate = useNavigate();
  const { connect, connectWithOAuth, isConnected, isConnecting, address } = useWallet();
  const [connectingMethod, setConnectingMethod] = useState<string | null>(null);

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
    setConnectingMethod("phantom");
    try {
      await connect();
    } catch (error) {
      console.error("Phantom connect error:", error);
    } finally {
      setConnectingMethod(null);
    }
  };

  const handleGoogleConnect = async () => {
    setConnectingMethod("google");
    try {
      await connectWithOAuth("google");
    } catch (error) {
      console.error("Google connect error:", error);
    } finally {
      setConnectingMethod(null);
    }
  };

  const handleAppleConnect = async () => {
    setConnectingMethod("apple");
    try {
      await connectWithOAuth("apple");
    } catch (error) {
      console.error("Apple connect error:", error);
    } finally {
      setConnectingMethod(null);
    }
  };

  const isLoading = isConnecting || connectingMethod !== null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Hero Image (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-emerald-50 to-emerald-100 items-center justify-center p-8">
        <img 
          src={authBranding} 
          alt="The Lily Pad" 
          className="w-full h-full object-contain"
        />
      </div>
      
      {/* Right side - Wallet Connect */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 bg-background">
        {/* Mobile Branding */}
        <div className="lg:hidden mb-6 w-full max-w-[280px]">
          <img 
            src={authBranding} 
            alt="The Lily Pad" 
            className="w-full h-auto rounded-lg"
          />
        </div>
        
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Welcome to The Lily Pad</CardTitle>
            <CardDescription>Connect your wallet to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary: Phantom Wallet */}
            <Button
              onClick={handlePhantomConnect}
              disabled={isLoading}
              className="w-full h-12 text-base font-medium"
              variant="default"
            >
              {connectingMethod === "phantom" || (isConnecting && !connectingMethod) ? (
                <Loader2 className="w-5 h-5 animate-spin mr-3" />
              ) : (
                <span className="mr-3"><PhantomIcon /></span>
              )}
              Connect with Phantom
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or continue with
                </span>
              </div>
            </div>

            {/* OAuth options via Phantom Smart Wallet */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleGoogleConnect}
                disabled={isLoading}
                variant="outline"
                className="h-11"
              >
                {connectingMethod === "google" ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <span className="mr-2"><GoogleIcon /></span>
                )}
                Google
              </Button>
              <Button
                onClick={handleAppleConnect}
                disabled={isLoading}
                variant="outline"
                className="h-11"
              >
                {connectingMethod === "apple" ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <span className="mr-2"><AppleIcon /></span>
                )}
                Apple
              </Button>
            </div>

            {/* Info text */}
            <p className="text-xs text-muted-foreground text-center pt-4">
              Don't have a wallet? Choose Google or Apple to create a smart wallet automatically with Phantom.
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
