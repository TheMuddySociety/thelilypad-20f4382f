import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { TipModal } from "./TipModal";
import { useStreamerWallet } from "@/hooks/useStreamerWallet";
import { toast } from "@/hooks/use-toast";

interface TipButtonProps {
  streamerId: string;
  streamerName: string;
  streamId?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export const TipButton: React.FC<TipButtonProps> = ({
  streamerId,
  streamerName,
  streamId,
  variant = "default",
  size = "default",
  className,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const { fetchWalletAddress, isLoading } = useStreamerWallet();

  const handleOpenTipModal = async () => {
    // Fetch wallet address securely when user clicks tip
    const result = await fetchWalletAddress(streamerId);
    
    if (result?.wallet_address) {
      setWalletAddress(result.wallet_address);
      setIsModalOpen(true);
    } else {
      toast({
        title: "Cannot tip",
        description: "This streamer hasn't set up their wallet yet or you need to be logged in.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleOpenTipModal}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Heart className="w-4 h-4 mr-2" />
        )}
        Tip
      </Button>

      {walletAddress && (
        <TipModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          streamerAddress={walletAddress}
          streamerName={streamerName}
          streamerId={streamerId}
          streamId={streamId}
        />
      )}
    </>
  );
};
