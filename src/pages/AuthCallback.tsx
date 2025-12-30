import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPhantomSDK } from "@/config/phantom";
import FrogLoader from "@/components/FrogLoader";

/**
 * Auth callback page for Phantom OAuth redirect
 * This page handles the redirect from Phantom's OAuth flow
 */
const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const sdk = getPhantomSDK();
        
        // The SDK should automatically handle the callback
        // by checking URL parameters set by Phantom
        await sdk.autoConnect();
        
        // Redirect back to home after successful connection
        navigate("/", { replace: true });
      } catch (error) {
        console.error("Auth callback error:", error);
        // Redirect to home even on error
        navigate("/", { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <FrogLoader size="lg" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
