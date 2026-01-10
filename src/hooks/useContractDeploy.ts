// Monad Contract Deploy Hook - Coming Soon
// This hook is a placeholder for future Monad EVM support

import { useState } from "react";
import { toast } from "sonner";

const MONAD_COMING_SOON_MESSAGE = "Monad EVM support is coming soon. Please use Solana for now.";

export const useContractDeploy = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deployCollection = async () => {
    toast.info(MONAD_COMING_SOON_MESSAGE);
    return null;
  };

  const deployWithMetaTx = async () => {
    toast.info(MONAD_COMING_SOON_MESSAGE);
    return null;
  };

  return {
    isLoading,
    error,
    deployCollection,
    deployWithMetaTx,
    isMonadSupported: false,
  };
};
